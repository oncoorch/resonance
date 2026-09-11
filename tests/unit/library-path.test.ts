import { describe, expect, it } from 'vitest';
import { buildLibraryPath, sanitizeSegment } from '../../packages/core/src/library-path.js';

describe('rutas de biblioteca', () => {
  it('crea rutas por artista y álbum sin cambiar extensión', () => {
    expect(buildLibraryPath({ artist: 'Radiohead', album: 'OK Computer', title: 'Paranoid Android', track: 2, disc: 1, discTotal: 1, extension: '.flac' })).toBe('Radiohead/OK Computer/Paranoid Android.flac');
  });
  it('usa formato multidisco y compilaciones', () => {
    expect(buildLibraryPath({ artist: 'Björk', albumArtist: 'Various Artists', album: 'Mix', title: 'Jóga', track: 3, disc: 2, discTotal: 2, compilation: true, extension: '.m4a' })).toBe('Compilations/Mix/Björk - Jóga.m4a');
  });
  it('impide traversal sin destruir Unicode', () => {
    expect(sanitizeSegment('../Niño/歌\0')).toBe('Niño／歌');
  });
});
