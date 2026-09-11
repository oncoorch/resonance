import { describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { scanAudioFiles } from '../../apps/server/src/services/scanner.js';

describe('auditoría de escaneo', () => {
  it('cuenta mp3 en subcarpetas, no-audio y bytes candidatos para revisar cobertura total', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'resonance-scan-'));
    await mkdir(path.join(root, 'nested'));
    await writeFile(path.join(root, 'song.mp3'), Buffer.alloc(10));
    await writeFile(path.join(root, 'nested', 'other.MP3'), Buffer.alloc(20));
    await writeFile(path.join(root, 'cover.jpg'), Buffer.alloc(30));
    const result = await scanAudioFiles(root);
    expect(result.files.map((file) => file.relativePath)).toEqual(['nested/other.MP3', 'song.mp3']);
    expect(result.summary).toMatchObject({ audioFiles: 2, nonAudioFiles: 1, audioBytes: 30, totalBytes: 60 });
  });
});
