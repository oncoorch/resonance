import { describe, expect, it } from 'vitest';
import { exportM3U8, exportAppleXml } from '../../apps/server/src/services/playlists.js';

describe('exportadores de playlists', () => {
  const tracks = [{ id: 't1', title: 'Jóga & Test', artist: 'Björk', duration: 240, absolutePath: '/Music/Björk/Jóga #1.m4a' }];
  it('crea M3U8 UTF-8 con rutas relativas', () => {
    expect(exportM3U8('Favoritas', tracks, '/Music/_Playlists')).toContain('../Björk/Jóga #1.m4a');
  });
  it('crea plist Apple válido con URL escapada y referencias', () => {
    const xml = exportAppleXml('Favoritas', tracks);
    expect(xml).toContain('file:///Music/Bj%C3%B6rk/J%C3%B3ga%20%231.m4a');
    expect(xml).toContain('Jóga &amp; Test');
    expect(xml).toContain('<key>Track ID</key><integer>1</integer>');
  });
});
