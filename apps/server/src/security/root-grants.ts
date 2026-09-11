import { randomUUID } from 'node:crypto';
import { lstat, realpath } from 'node:fs/promises';
import path from 'node:path';

export type RootRole = 'source' | 'destination';
export interface RootGrant { id: string; path: string; role: RootRole; createdAt: string }

type StoredGrant = RootGrant & { dev: number; ino: number };
type Identity = { path: string; dev: number; ino: number };

function sameIdentity(actual: { dev: number; ino: number }, expected: { dev: number; ino: number }): boolean {
  return actual.dev === expected.dev && actual.ino === expected.ino;
}

export class RootGrants {
  #grants = new Map<string, StoredGrant>();
  async authorize(inputPath: string, role: RootRole): Promise<RootGrant> {
    if (!path.isAbsolute(inputPath)) throw new Error('La ruta debe ser absoluta');
    const canonical = await realpath(inputPath); const stat = await lstat(canonical);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('La raíz debe ser un directorio real');
    for (const existing of this.#grants.values()) {
      const fromExisting = path.relative(existing.path, canonical);
      const fromCandidate = path.relative(canonical, existing.path);
      const candidateInside = fromExisting === '' || (!fromExisting.startsWith('..') && !path.isAbsolute(fromExisting));
      const existingInside = fromCandidate === '' || (!fromCandidate.startsWith('..') && !path.isAbsolute(fromCandidate));
      if (candidateInside || existingInside) throw new Error('Las raíces no pueden ser iguales ni anidadas');
    }
    const grant = { id: randomUUID(), path: canonical, role, createdAt: new Date().toISOString(), dev: stat.dev, ino: stat.ino } satisfies StoredGrant;
    this.#grants.set(grant.id, grant); return this.#publicGrant(grant);
  }
  list(): RootGrant[] { return [...this.#grants.values()].map((grant) => this.#publicGrant(grant)); }
  get(id: string): RootGrant | undefined { const grant = this.#grants.get(id); return grant ? this.#publicGrant(grant) : undefined; }
  revoke(id: string): void { this.#grants.delete(id); }
  async resolve(id: string, relativePath: string): Promise<string> {
    const grant = this.#grants.get(id); if (!grant) throw new Error('Raíz no autorizada');
    if (!relativePath || path.isAbsolute(relativePath) || relativePath.split(/[\\/]/).some((part) => part === '..' || part === '.' || part.includes('\0'))) throw new Error('Ruta relativa inválida');

    const identities: Identity[] = [];
    const rootStat = await lstat(grant.path);
    if (rootStat.isSymbolicLink() || !rootStat.isDirectory() || !sameIdentity(rootStat, grant)) throw new Error('La raíz autorizada cambió');
    identities.push({ path: grant.path, dev: rootStat.dev, ino: rootStat.ino });

    let current = grant.path;
    const parts = relativePath.split(/[\\/]/).filter(Boolean);
    const intended = path.join(grant.path, ...parts);
    for (let index = 0; index < parts.length; index += 1) {
      current = path.join(current, parts[index]);
      try {
        const currentStat = await lstat(current);
        if (currentStat.isSymbolicLink()) throw new Error('La ruta contiene un enlace no permitido');
        if (index < parts.length - 1 && !currentStat.isDirectory()) throw new Error('La ruta contiene un componente no-directorio');
        identities.push({ path: current, dev: currentStat.dev, ino: currentStat.ino });
      } catch (error: any) {
        if (error?.code === 'ENOENT' && grant.role === 'destination') break;
        throw error;
      }
    }
    const relative = path.relative(grant.path, intended); if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Ruta fuera de la raíz autorizada');
    for (const expected of identities) {
      const actual = await lstat(expected.path);
      if (actual.isSymbolicLink() || !sameIdentity(actual, expected)) throw new Error('La ruta autorizada cambió durante la resolución');
    }
    return intended;
  }

  #publicGrant(grant: StoredGrant): RootGrant { return { id: grant.id, path: grant.path, role: grant.role, createdAt: grant.createdAt }; }
}
