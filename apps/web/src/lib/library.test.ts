import { describe, expect, it } from 'vitest';
import { buildBrowserManifest, confidenceTone, formatBytes } from './library';

function file(name: string, size: number, type = 'audio/mpeg'): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe('library UI helpers', () => {
  it('formats byte totals for the Spanish dashboard', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1536)).toBe('1,5 KB');
    expect(formatBytes(5_368_709_120)).toBe('5 GB');
  });

  it('maps confidence to the documented semantic ranges', () => {
    expect(confidenceTone(96)).toBe('alta');
    expect(confidenceTone(84)).toBe('media');
    expect(confidenceTone(69)).toBe('baja');
    expect(confidenceTone(null)).toBe('desconocida');
  });

  it('creates a browser preview manifest without fake rows', () => {
    const entries = [
      { relativePath: 'Radiohead/OK Computer/01 Airbag.mp3', file: file('01 Airbag.mp3', 12) },
      { relativePath: 'cover.jpg', file: file('cover.jpg', 4, 'image/jpeg') },
    ];
    expect(buildBrowserManifest(entries)).toEqual({
      files: 2,
      audioFiles: 1,
      bytes: 16,
      sample: ['Radiohead/OK Computer/01 Airbag.mp3', 'cover.jpg'],
    });
  });
});
