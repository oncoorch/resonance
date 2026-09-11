import { describe, expect, it } from 'vitest';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { sha256File, copyVerifiedNoClobber } from '../../apps/server/src/services/filesystem.js';

describe('copias seguras', () => {
  it('copia por stream y verifica SHA-256', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'resonancia-copy-'));
    const source = path.join(root, 'source.flac'); const target = path.join(root, 'dest.flac');
    await writeFile(source, Buffer.alloc(1024 * 1024, 7));
    const result = await copyVerifiedNoClobber(source, target);
    expect(result.sourceHash).toBe(await sha256File(source));
    expect(result.targetHash).toBe(result.sourceHash);
    expect(await readFile(target)).toEqual(await readFile(source));
  });
  it('no sobrescribe destinos existentes', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'resonancia-copy-'));
    const source = path.join(root, 'a.mp3'); const target = path.join(root, 'b.mp3');
    await writeFile(source, 'nuevo'); await writeFile(target, 'existente');
    await expect(copyVerifiedNoClobber(source, target)).rejects.toMatchObject({ code: 'EEXIST' });
    expect(await readFile(target, 'utf8')).toBe('existente');
  });
});
