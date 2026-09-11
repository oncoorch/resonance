import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, link, mkdir, open, realpath, rename, rm } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

interface PathIdentity { path: string; dev: number; ino: number }
const execFileAsync = promisify(execFile);

function securityError(message: string, code = 'ELOOP'): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

function sameIdentity(actual: { dev: number; ino: number }, expected: { dev: number; ino: number }): boolean {
  return actual.dev === expected.dev && actual.ino === expected.ino;
}

async function normalizePlatformRoot(filePath: string): Promise<string> {
  const resolved = path.resolve(filePath);
  const parsed = path.parse(resolved);
  const parts = resolved.slice(parsed.root.length).split(path.sep).filter(Boolean);
  if (parts.length === 0) return resolved;
  // macOS exposes /var, /tmp, and /etc as root-owned compatibility symlinks.
  // Canonicalize only that first, privileged component; all user-controlled
  // descendants are still walked with lstat and may not be symlinks.
  const canonicalTop = await realpath(path.join(parsed.root, parts[0]));
  return path.join(canonicalTop, ...parts.slice(1));
}

async function captureExistingPath(filePath: string, includeLeaf: boolean): Promise<PathIdentity[]> {
  if (!path.isAbsolute(filePath)) throw securityError('La ruta debe ser absoluta', 'INVALID_PATH');
  const normalized = await normalizePlatformRoot(filePath);
  const parsed = path.parse(normalized);
  const parts = normalized.slice(parsed.root.length).split(path.sep).filter(Boolean);
  const limit = includeLeaf ? parts.length : Math.max(0, parts.length - 1);
  const identities: PathIdentity[] = [];
  let current = parsed.root;
  const rootStat = await lstat(current);
  identities.push({ path: current, dev: rootStat.dev, ino: rootStat.ino });
  for (let index = 0; index < limit; index += 1) {
    current = path.join(current, parts[index]);
    const info = await lstat(current);
    if (info.isSymbolicLink()) throw securityError(`La ruta contiene un enlace simbólico: ${current}`);
    if (index < limit - 1 && !info.isDirectory()) throw securityError(`Componente no-directorio: ${current}`, 'ENOTDIR');
    identities.push({ path: current, dev: info.dev, ino: info.ino });
  }
  return identities;
}

async function prepareTargetParent(target: string): Promise<PathIdentity[]> {
  if (!path.isAbsolute(target)) throw securityError('La ruta debe ser absoluta', 'INVALID_PATH');
  const directory = await normalizePlatformRoot(path.dirname(path.resolve(target)));
  const parsed = path.parse(directory);
  const parts = directory.slice(parsed.root.length).split(path.sep).filter(Boolean);
  const identities: PathIdentity[] = [];
  let current = parsed.root;
  let info = await lstat(current);
  identities.push({ path: current, dev: info.dev, ino: info.ino });
  for (const part of parts) {
    current = path.join(current, part);
    try {
      info = await lstat(current);
    } catch (error: any) {
      if (error?.code !== 'ENOENT') throw error;
      await mkdir(current, { mode: 0o700 });
      info = await lstat(current);
    }
    if (info.isSymbolicLink()) throw securityError(`La ruta contiene un enlace simbólico: ${current}`);
    if (!info.isDirectory()) throw securityError(`Componente no-directorio: ${current}`, 'ENOTDIR');
    identities.push({ path: current, dev: info.dev, ino: info.ino });
  }
  return identities;
}

async function revalidate(identities: PathIdentity[]): Promise<void> {
  for (const expected of identities) {
    const actual = await lstat(expected.path);
    if (actual.isSymbolicLink() || !sameIdentity(actual, expected)) throw securityError('La ascendencia de la ruta cambió durante la operación', 'PATH_CHANGED');
  }
}

function noFollowReadFlags(): number {
  if (typeof constants.O_NOFOLLOW !== 'number') throw securityError('O_NOFOLLOW no está disponible en esta plataforma', 'UNSUPPORTED_PLATFORM');
  return constants.O_RDONLY | constants.O_NOFOLLOW;
}

async function hashHandle(handle: FileHandle): Promise<string> {
  const hash = createHash('sha256');
  await pipeline(handle.createReadStream({ autoClose: false, start: 0 }), hash);
  return hash.digest('hex');
}

export async function sha256File(filePath: string): Promise<string> {
  const ancestry = await captureExistingPath(filePath, true);
  const handle = await open(filePath, noFollowReadFlags());
  try {
    const before = await handle.stat();
    if (!before.isFile()) throw securityError('La ruta no es un archivo regular', 'EINVAL');
    const hash = await hashHandle(handle);
    const after = await handle.stat();
    if (!sameIdentity(after, before) || after.size !== before.size || after.mtimeMs !== before.mtimeMs) throw securityError('El archivo cambió durante el hash', 'SOURCE_CHANGED');
    await revalidate(ancestry);
    return hash;
  } finally {
    await handle.close();
  }
}

export function sourceSnapshotMatches(current: { size: number; mtimeMs: number }, planned: { size: number; mtimeMs: number }): boolean {
  return current.size === planned.size && current.mtimeMs === planned.mtimeMs;
}

export function hasSufficientSpace(requiredBytes: number, availableBlocks: number, blockSize: number): boolean {
  const available = availableBlocks * blockSize; const reserve = Math.max(64 * 1024 * 1024, Math.ceil(available * 0.05));
  return Number.isFinite(requiredBytes) && requiredBytes >= 0 && available - reserve >= requiredBytes;
}

export async function copyVerifiedNoClobber(source: string, target: string): Promise<{ sourceHash: string; targetHash: string; bytes: number }> {
  const sourceAncestry = await captureExistingPath(source, true);
  const targetAncestry = await prepareTargetParent(target);
  const sourceHandle = await open(source, noFollowReadFlags());
  const temp = path.join(path.dirname(target), `.${path.basename(target)}.${randomUUID()}.part`);
  let tempHandle: FileHandle | undefined;
  try {
    const before = await sourceHandle.stat();
    if (!before.isFile()) throw securityError('El origen no es un archivo regular', 'EINVAL');
    tempHandle = await open(temp, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
    const sourceHashState = createHash('sha256');
    for await (const chunk of sourceHandle.createReadStream({ autoClose: false, start: 0 })) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      sourceHashState.update(bytes);
      await tempHandle.write(bytes);
    }
    await tempHandle.sync();
    const sourceHash = sourceHashState.digest('hex');
    await tempHandle.close(); tempHandle = undefined;

    const targetHash = await sha256File(temp);
    const after = await sourceHandle.stat();
    if (!sameIdentity(after, before) || before.size !== after.size || before.mtimeMs !== after.mtimeMs) throw securityError('El origen cambió durante la copia', 'SOURCE_CHANGED');
    if (sourceHash !== targetHash) throw securityError('La verificación SHA-256 falló', 'HASH_MISMATCH');
    await revalidate(sourceAncestry);
    await revalidate(targetAncestry);
    // POSIX hard-link creation is atomic and fails with EEXIST; unlike rename,
    // it never replaces a file that appeared after simulation.
    await link(temp, target);
    await revalidate(targetAncestry);
    await rm(temp);
    return { sourceHash, targetHash, bytes: before.size };
  } finally {
    await tempHandle?.close().catch(() => undefined);
    await sourceHandle.close().catch(() => undefined);
    await rm(temp, { force: true }).catch(() => undefined);
  }
}

export async function writeTextNoClobber(target: string, content: string): Promise<void> {
  const targetAncestry = await prepareTargetParent(target);
  const temp = path.join(path.dirname(target), `.${path.basename(target)}.${randomUUID()}.part`);
  let handle: FileHandle | undefined;
  try {
    handle = await open(temp, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
    await handle.writeFile(content, 'utf8'); await handle.sync(); await handle.close(); handle = undefined;
    await revalidate(targetAncestry); await link(temp, target); await revalidate(targetAncestry);
    const directory = await open(path.dirname(target), constants.O_RDONLY); try { await directory.sync(); } finally { await directory.close(); }
    await rm(temp);
  } finally {
    await handle?.close().catch(() => undefined); await rm(temp, { force: true }).catch(() => undefined);
  }
}

export async function removeVerifiedFile(target: string, expectedHash: string): Promise<void> {
  const parentAncestry = await captureExistingPath(target, false);
  const handle = await open(target, noFollowReadFlags());
  const quarantine = path.join(path.dirname(target), `.${path.basename(target)}.${randomUUID()}.rollback`);
  let moved = false;
  try {
    const identity = await handle.stat(); if (!identity.isFile()) throw securityError('El destino no es un archivo regular', 'EINVAL');
    if (await hashHandle(handle) !== expectedHash) throw securityError('El hash final cambió; rollback bloqueado', 'HASH_MISMATCH');
    await revalidate(parentAncestry); await rename(target, quarantine); moved = true;
    const movedIdentity = await lstat(quarantine);
    if (!sameIdentity(movedIdentity, identity)) {
      try { await rename(quarantine, target); moved = false; } catch { /* preserve for manual recovery */ }
      throw securityError('El destino cambió durante rollback', 'PATH_CHANGED');
    }
    await rm(quarantine); moved = false;
    const directory = await open(path.dirname(target), constants.O_RDONLY); try { await directory.sync(); } finally { await directory.close(); }
  } finally {
    await handle.close().catch(() => undefined);
    if (moved) { /* An unverified quarantine is deliberately preserved. */ }
  }
}

export async function moveVerifiedFileToTrash(target: string, expectedHash: string): Promise<void> {
  const ancestry = await captureExistingPath(target, true);
  const handle = await open(target, noFollowReadFlags());
  try {
    const identity = await handle.stat();
    if (!identity.isFile()) throw securityError('El destino no es un archivo regular', 'EINVAL');
    if (await hashHandle(handle) !== expectedHash) throw securityError('El archivo cambió; borrado bloqueado', 'HASH_MISMATCH');
    await revalidate(ancestry);
    if (process.platform === 'darwin') {
      await execFileAsync('osascript', ['-e', `tell application "Finder" to delete POSIX file ${JSON.stringify(target)}`]);
      return;
    }
    const trash = path.join(process.env.XDG_DATA_HOME ?? path.join(process.env.HOME ?? '.', '.local', 'share'), 'Trash', 'files');
    await mkdir(trash, { recursive: true, mode: 0o700 });
    const destination = path.join(trash, `${path.basename(target)}.${randomUUID()}`);
    await rename(target, destination);
  } finally {
    await handle.close().catch(() => undefined);
  }
}
