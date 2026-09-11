import { describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rename, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { RootGrants } from '../../apps/server/src/security/root-grants.js';

describe('capacidades de raíz', () => {
  it('no acepta rutas relativas ni accede fuera del grant', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'resonancia-root-'));
    const grants = new RootGrants(); const grant = await grants.authorize(root, 'source');
    await expect(grants.resolve(grant.id, '../secreto')).rejects.toThrow(/ruta/i);
    await expect(grants.resolve('inexistente', 'x')).rejects.toThrow(/autorizada/i);
  });
  it('conserva la ruta destino completa aunque falten directorios intermedios', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'resonancia-destination-'));
    const grants = new RootGrants(); const grant = await grants.authorize(root, 'destination');
    expect(await grants.resolve(grant.id, 'Artista/Álbum/canción.flac')).toBe(path.join(grant.path, 'Artista', 'Álbum', 'canción.flac'));
  });
  it('rejects overlapping source and destination roots', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'resonancia-root-'));
    const nested = path.join(root, 'nested'); await mkdir(nested);
    const grants = new RootGrants(); await grants.authorize(root, 'source');
    await expect(grants.authorize(nested, 'destination')).rejects.toThrow(/anidadas/i);
  });
  it('rechaza enlaces en el recorrido', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'resonancia-root-'));
    await mkdir(path.join(root, 'ok')); await symlink(tmpdir(), path.join(root, 'ok', 'escape'));
    const grants = new RootGrants(); const grant = await grants.authorize(root, 'source');
    await expect(grants.resolve(grant.id, 'ok/escape/archivo')).rejects.toThrow(/enlace/i);
  });

  it('revokes confinement when an authorized root is replaced', async () => {
    const parent = await mkdtemp(path.join(tmpdir(), 'resonancia-root-swap-'));
    const root = path.join(parent, 'root');
    const outside = path.join(parent, 'outside');
    await mkdir(root); await mkdir(outside); await writeFile(path.join(outside, 'song.mp3'), 'outside');
    const grants = new RootGrants(); const grant = await grants.authorize(root, 'source');
    await rename(root, path.join(parent, 'moved-root'));
    await symlink(outside, root);
    await expect(grants.resolve(grant.id, 'song.mp3')).rejects.toThrow(/raíz|enlace|cambió/i);
  });
});
