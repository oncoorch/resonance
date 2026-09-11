import { describe, expect, it } from 'vitest';
import { parseFile } from 'music-metadata';
import { mkdtemp, readdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readTrackMetadata } from '../../apps/server/src/services/metadata.js';

const fixtureDir = path.resolve('tests/fixtures/audio');
describe('matriz real de formatos', () => {
  it('analiza MP3, AAC, AAC/M4A, ALAC/M4A, FLAC, WAV, AIFF, OGG y OPUS sin convertir', async () => {
    const files = (await readdir(fixtureDir)).sort();
    expect(files).toHaveLength(9);
    const parsed = await Promise.all(files.map(async (name) => ({ name, metadata: await parseFile(path.join(fixtureDir, name), { duration: true }) })));
    expect(parsed.every(({ metadata }) => (metadata.format.duration ?? 0) > 0)).toBe(true);
    expect(parsed.find(({ name }) => name === 'test-alac.m4a')?.metadata.format.codec).toMatch(/ALAC/i);
    expect(parsed.find(({ name }) => name === 'test.m4a')?.metadata.format.codec).toMatch(/AAC/i);
    expect(parsed.find(({ name }) => name === 'test.mp3')?.metadata.common).toMatchObject({ title: 'Jóga Test', artist: 'Björk', album: 'Fixtures' });
  });
  it('never follows a symlink while parsing metadata', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'resonancia-metadata-link-')); const linked = path.join(dir, 'linked.mp3');
    await symlink(path.resolve(fixtureDir, 'test.mp3'), linked);
    await expect(readTrackMetadata(linked)).rejects.toThrow(/enlace|symbolic/i);
  });
});
