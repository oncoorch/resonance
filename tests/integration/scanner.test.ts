import { describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, symlink, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { scanAudioFiles } from '../../apps/server/src/services/scanner.js';

describe('escáner read-only', () => {
  it('encuentra audio recursivo, ignora no-audio y no sigue enlaces', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'resonancia-scan-'));
    await mkdir(path.join(root, 'Álbum'), { recursive: true });
    await writeFile(path.join(root, 'Álbum', '01 canción.MP3'), 'audio');
    await writeFile(path.join(root, 'nota.txt'), 'texto');
    await symlink(tmpdir(), path.join(root, 'fuera'));
    const before = await readFile(path.join(root, 'Álbum', '01 canción.MP3'));
    const result = await scanAudioFiles(root);
    expect(result.files.map((f) => f.relativePath)).toEqual(['Álbum/01 canción.MP3']);
    expect(result.skippedLinks).toBe(1);
    expect(await readFile(path.join(root, 'Álbum', '01 canción.MP3'))).toEqual(before);
  });
});
