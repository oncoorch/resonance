import path from 'node:path';

const cleanSegment = (value: string) => {
  const printable = [...value.normalize('NFC')].filter((char) => { const code = char.codePointAt(0) ?? 0; return code >= 32 && code !== 127; }).join('');
  return printable.replace(/[\\/]/g, '／').replace(/^\.+|[. ]+$/g, '').slice(0, 160) || 'Sin nombre';
};

export function normalizeSongTitle(value: string): string {
  let title = value.replace(/\.[a-z0-9]{2,5}$/i, '').normalize('NFC').trim();
  title = title.replace(/^\s*(?:cd\s*\d+\s*[-_.]\s*)?(?:disc\s*\d+\s*[-_.]\s*)?\d{1,4}\s*[-_.·)]\s*/iu, '');
  title = title.replace(/^\s*\d{1,4}\s+/, '');
  return title.trim() || 'Sin nombre';
}

export function buildTargetRelativePath(track: { artist?: string | null; albumArtist?: string | null; album?: string | null; title?: string | null; originalFilename: string; trackNo?: number | null }): string {
  const artist = cleanSegment(track.albumArtist || track.artist || 'Artista desconocido');
  const album = cleanSegment(track.album || 'Álbum desconocido');
  const rawTitle = track.title || path.basename(track.originalFilename, path.extname(track.originalFilename));
  const title = cleanSegment(normalizeSongTitle(rawTitle));
  return path.join(artist, album, `${title}${path.extname(track.originalFilename).toLowerCase()}`);
}
