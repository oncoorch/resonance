import path from 'node:path';

export interface LibraryTrack {
  artist?: string; albumArtist?: string; album?: string; title?: string;
  track?: number | null; disc?: number | null; discTotal?: number | null;
  compilation?: boolean; extension: string;
}

export function sanitizeSegment(value: string): string {
  const normalized = value.normalize('NFC').replace(/\0/g, '').replace(/\.{2}[\\/]/g, '').replace(/[\\/]/g, '／');
  const withoutTraversal = [...normalized].filter((character) => { const code = character.codePointAt(0) ?? 0; return code > 31 && code !== 127; }).join('').trim().replace(/[. ]+$/g, '');
  const safe = withoutTraversal === '.' || withoutTraversal === '..' || !withoutTraversal ? 'Sin nombre' : withoutTraversal;
  return Buffer.byteLength(safe) <= 180 ? safe : `${Buffer.from(safe).subarray(0, 160).toString().replace(/�+$/u, '')}…`;
}

export function buildLibraryPath(track: LibraryTrack): string {
  const artist = sanitizeSegment(track.artist || 'Artista desconocido');
  const album = sanitizeSegment(track.album || 'Álbum desconocido');
  const title = sanitizeSegment(track.title || 'Sin título');
  const rootArtist = track.compilation ? 'Compilations' : sanitizeSegment(track.albumArtist || track.artist || 'Artista desconocido');
  const credited = track.compilation ? `${artist} - ` : '';
  const ext = track.extension.startsWith('.') ? track.extension : `.${track.extension}`;
  return path.posix.join(rootArtist, album, `${credited}${title}${ext.toLowerCase()}`);
}
