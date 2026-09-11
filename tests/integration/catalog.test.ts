import { describe, expect, it } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Catalog } from '../../apps/server/src/db/catalog.js';

describe('persistent SQLite catalog', () => {
  it('migrates a new database and retains catalog/settings after reopen', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'mlo-catalog-')); const dbPath = path.join(dir, 'catalog.db');
    const first = new Catalog(dbPath);
    first.addRoot({ id: 'root-1', role: 'source', path: dir, createdAt: new Date().toISOString() });
    const id = first.upsertTrack({ rootId: 'root-1', relativePath: 'song.wav', originalPath: path.join(dir, 'song.wav'), originalFilename: 'song.wav', title: 'Song', bytes: 10, mtimeMs: 1, metadataSource: 'tags' });
    first.setFavorite(id, true); first.updateSettings({ mode: 'safe' }); first.close();
    const second = new Catalog(dbPath);
    expect(second.tracks()).toMatchObject([{ id, title: 'Song', favorite: true }]);
    expect(second.settings()).toMatchObject({ mode: 'safe', internetEnabled: false });
    expect(() => second.db.prepare("INSERT INTO roots VALUES ('bad','other','/tmp','now')").run()).toThrow();
    second.close();
  });
});
