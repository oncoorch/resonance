import { describe, expect, it } from 'vitest';
import { mkdtemp, copyFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { writeTagsOnStagedCopy } from '../../apps/server/src/services/tag-writer.js';

describe('adaptador de tags aislado', () => {
  it('actualiza solo staging y nunca el origen', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'resonancia-tags-'));
    const source = path.resolve('tests/fixtures/audio/test.mp3'); const staged = path.join(dir, 'staged.mp3');
    const original = await readFile(source); await copyFile(source, staged);
    const result = await writeTagsOnStagedCopy(staged, { title: 'Nuevo título', artist: 'Artista' }, dir);
    expect(result).toMatchObject({ status: 'updated' });
    expect(await readFile(source)).toEqual(original);
  });

  it('rechaza un archivo absoluto fuera de la raíz de staging', async () => {
    const stagingRoot = await mkdtemp(path.join(tmpdir(), 'resonancia-stage-root-'));
    const outsideRoot = await mkdtemp(path.join(tmpdir(), 'resonancia-stage-outside-'));
    const outside = path.join(outsideRoot, 'outside.mp3');
    await copyFile(path.resolve('tests/fixtures/audio/test.mp3'), outside);
    const original = await readFile(outside);
    await expect(writeTagsOnStagedCopy(outside, { title: 'No permitido' }, stagingRoot)).rejects.toThrow(/staging|fuera/i);
    expect(await readFile(outside)).toEqual(original);
  });
});
