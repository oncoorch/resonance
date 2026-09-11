import { spawn } from 'node:child_process';
import { lstat, realpath } from 'node:fs/promises';
import path from 'node:path';

export interface WritableTags { title?: string | null; artist?: string | null; album?: string | null; albumartist?: string | null; track?: number | null; disc?: number | null; year?: number | null; genre?: string | null; compilation?: boolean | null }
export interface TagWriterResult { status: 'updated'; written: string[]; tags: Record<string, unknown> }

export async function writeTagsOnStagedCopy(filePath: string, tags: WritableTags, stagingRoot: string, timeoutMs = 15_000): Promise<TagWriterResult> {
  if (!path.isAbsolute(filePath) || !path.isAbsolute(stagingRoot)) throw new Error('Las rutas de staging deben ser absolutas');
  const [fileStat, rootStat] = await Promise.all([lstat(filePath), lstat(stagingRoot)]);
  if (!fileStat.isFile() || fileStat.isSymbolicLink() || !rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error('Staging debe usar archivos y directorios reales');
  const [canonicalFile, canonicalRoot] = await Promise.all([realpath(filePath), realpath(stagingRoot)]);
  const relative = path.relative(canonicalRoot, canonicalFile);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('El archivo está fuera de la raíz de staging');
  const directory = path.resolve('helpers/tag-writer');
  const python = path.join(directory, '.venv', 'bin', 'python'); const helper = path.join(directory, 'main.py');
  return await new Promise((resolve, reject) => {
    const child = spawn(python, [helper], { cwd: directory, stdio: ['pipe', 'pipe', 'pipe'], shell: false });
    const stdout: Buffer[] = []; const stderr: Buffer[] = [];
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('El escritor de tags excedió el tiempo permitido')); }, timeoutMs);
    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk)); child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
    child.on('error', (error) => { clearTimeout(timer); reject(error); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) { reject(new Error(`Escritura de tags rechazada: ${Buffer.concat(stderr).toString().slice(0, 500)}`)); return; }
      try { resolve(JSON.parse(Buffer.concat(stdout).toString()) as TagWriterResult); } catch { reject(new Error('Respuesta inválida del escritor de tags')); }
    });
    child.stdin.end(JSON.stringify({ path: canonicalFile, stagingRoot: canonicalRoot, tags }));
  });
}
