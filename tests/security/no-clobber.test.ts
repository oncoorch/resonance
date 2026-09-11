import { describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { copyVerifiedNoClobber, removeVerifiedFile, sha256File, writeTextNoClobber } from '../../apps/server/src/services/filesystem.js';

describe('publicación atómica', () => {
  it('si aparece el destino durante la publicación jamás lo reemplaza', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'resonancia-race-'));
    const source = path.join(root, 'a.flac'); const target = path.join(root, 'b.flac');
    await writeFile(source, 'origen');
    await copyVerifiedNoClobber(source, target);
    await expect(copyVerifiedNoClobber(source, target)).rejects.toMatchObject({ code: 'EEXIST' });
    expect(await readFile(target, 'utf8')).toBe('origen');
  });

  it('rechaza un origen que sea un enlace simbólico', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'resonancia-source-link-'));
    const realSource = path.join(root, 'real.flac');
    const sourceLink = path.join(root, 'source.flac');
    await writeFile(realSource, 'audio'); await symlink(realSource, sourceLink);
    await expect(copyVerifiedNoClobber(sourceLink, path.join(root, 'target.flac'))).rejects.toMatchObject({ code: 'ELOOP' });
    await expect(sha256File(sourceLink)).rejects.toMatchObject({ code: 'ELOOP' });
  });

  it('rechaza un enlace simbólico en la ascendencia del destino', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'resonancia-target-link-'));
    const outside = await mkdtemp(path.join(tmpdir(), 'resonancia-outside-'));
    const source = path.join(root, 'source.flac');
    const linkedDirectory = path.join(root, 'linked');
    await writeFile(source, 'audio'); await mkdir(outside, { recursive: true }); await symlink(outside, linkedDirectory);
    await expect(copyVerifiedNoClobber(source, path.join(linkedDirectory, 'target.flac'))).rejects.toThrow(/enlace|symbolic/i);
    await expect(readFile(path.join(outside, 'target.flac'))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('publica playlists sin reemplazar archivos ni seguir ancestros enlazados', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'resonancia-text-'));
    const target = path.join(root, 'lists', 'favoritas.m3u8');
    await writeTextNoClobber(target, '#EXTM3U\n');
    expect(await readFile(target, 'utf8')).toBe('#EXTM3U\n');
    await expect(writeTextNoClobber(target, 'reemplazo')).rejects.toMatchObject({ code: 'EEXIST' });
  });

  it('rollback elimina solo el inode con el hash final esperado', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'resonancia-rollback-')); const target = path.join(root, 'copy.flac');
    await writeFile(target, 'editado');
    await expect(removeVerifiedFile(target, 'hash-incorrecto')).rejects.toThrow(/hash/i);
    expect(await readFile(target, 'utf8')).toBe('editado');
    await removeVerifiedFile(target, await sha256File(target));
    await expect(readFile(target)).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
