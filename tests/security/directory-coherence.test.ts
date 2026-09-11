import { describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { verifyDirectoryCoherence } from '../../apps/server/src/services/directory-coherence.js';

describe('coherencia navegador-servicio', () => {
  it('exige conteos, bytes, audio y muestra compatibles', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'resonancia-coherence-')); await mkdir(path.join(root, 'A'));
    await writeFile(path.join(root, 'A', 'song.mp3'), 'audio'); await writeFile(path.join(root, 'notes.txt'), 'text');
    await expect(verifyDirectoryCoherence(root, { files: 2, audioFiles: 1, bytes: 9, sample: ['A/song.mp3', 'notes.txt'] })).resolves.toBe(true);
    await expect(verifyDirectoryCoherence(root, { files: 2, audioFiles: 1, bytes: 10, sample: ['A/song.mp3'] })).rejects.toThrow(/coincide/i);
  });
});
