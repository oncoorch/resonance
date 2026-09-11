import { lstat, opendir } from 'node:fs/promises';
import path from 'node:path';

const AUDIO = new Set(['.mp3','.m4a','.aac','.flac','.alac','.wav','.aif','.aiff','.aifc','.ogg','.oga','.opus']);
export interface BrowserManifest { files: number; audioFiles: number; bytes: number; sample: string[] }

export async function verifyDirectoryCoherence(root: string, manifest: BrowserManifest): Promise<true> {
  if (!manifest || !Number.isSafeInteger(manifest.files) || !Number.isSafeInteger(manifest.audioFiles) || !Number.isSafeInteger(manifest.bytes) || manifest.files < 0 || manifest.audioFiles < 0 || manifest.bytes < 0 || !Array.isArray(manifest.sample) || manifest.sample.length > 8 || manifest.sample.some((entry) => typeof entry !== 'string' || path.isAbsolute(entry) || entry.split(/[\\/]/).some((part) => part === '..' || part === '.'))) throw new Error('El manifiesto del navegador no es válido');
  let files = 0; let audioFiles = 0; let bytes = 0; const paths = new Set<string>();
  const walk = async (directory: string, prefix = ''): Promise<void> => {
    const handle = await opendir(directory);
    for await (const entry of handle) {
      const absolute = path.join(directory, entry.name); const relative = prefix ? `${prefix}/${entry.name}` : entry.name; const info = await lstat(absolute);
      if (info.isSymbolicLink()) throw new Error('La carpeta contiene enlaces simbólicos y no puede vincularse');
      if (info.isDirectory()) await walk(absolute, relative);
      else if (info.isFile()) { files += 1; bytes += info.size; paths.add(relative.normalize('NFC')); if (AUDIO.has(path.extname(entry.name).toLowerCase())) audioFiles += 1; }
    }
  };
  await walk(root);
  const sampleMatches = manifest.sample.every((entry) => paths.has(entry.normalize('NFC')));
  if (files !== manifest.files || audioFiles !== manifest.audioFiles || bytes !== manifest.bytes || !sampleMatches) throw new Error('La carpeta del navegador no coincide con la autorizada al servicio');
  return true;
}
