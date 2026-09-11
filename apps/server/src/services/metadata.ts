import { parseStream } from 'music-metadata';
import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import path from 'node:path';

export async function readTrackMetadata(filePath: string) {
  if (typeof constants.O_NOFOLLOW !== 'number') throw new Error('O_NOFOLLOW no está disponible en esta plataforma');
  const handle = await open(filePath, constants.O_RDONLY | constants.O_NOFOLLOW).catch((error: any) => {
    if (error?.code === 'ELOOP') throw new Error('No se permiten enlaces simbólicos al leer metadatos');
    throw error;
  });
  try {
    const before = await handle.stat(); if (!before.isFile()) throw new Error('La entrada no es un archivo regular');
    const parsed = await parseStream(handle.createReadStream({ autoClose: false, start: 0 }), filePath, { duration: true, skipCovers: true });
    const after = await handle.stat(); if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size || before.mtimeMs !== after.mtimeMs) throw new Error('El archivo cambió durante la lectura de metadatos');
    if (!parsed.format.container && !parsed.format.codec) throw new Error('Audio corrupto o contenedor no reconocido');
    const common = parsed.common;
    return {
      title: common.title ?? path.basename(filePath, path.extname(filePath)), artist: common.artist ?? null,
      album: common.album ?? null, albumArtist: common.albumartist ?? null, year: common.year ?? null,
      trackNo: common.track.no ?? null, discNo: common.disk.no ?? null, genre: common.genre?.[0] ?? null,
      duration: parsed.format.duration ?? null, format: parsed.format.container ?? path.extname(filePath).slice(1).toUpperCase(),
      codec: parsed.format.codec ?? null, metadataSource: 'tags',
    };
  } finally { await handle.close(); }
}
