import { AUDIO_EXTENSIONS, type BrowserManifest } from './library';

async function summarize(directory: FileSystemDirectoryHandle): Promise<BrowserManifest> {
  const manifest: BrowserManifest = { files: 0, audioFiles: 0, bytes: 0, sample: [] };
  const walk = async (current: FileSystemDirectoryHandle, prefix = ''): Promise<void> => {
    for await (const handle of current.values()) {
      const relativePath = prefix ? `${prefix}/${handle.name}` : handle.name;
      if (handle.kind === 'directory') await walk(handle, relativePath);
      else {
        const file = await handle.getFile(); manifest.files += 1; manifest.bytes += file.size;
        if (AUDIO_EXTENSIONS.has(relativePath.split('.').pop()?.toLowerCase() ?? '')) manifest.audioFiles += 1;
        if (manifest.sample.length < 8) manifest.sample.push(relativePath);
      }
    }
  };
  await walk(directory); return manifest;
}

export async function pickBrowserDirectory() {
  if (!window.showDirectoryPicker) throw new Error('Este navegador no ofrece el selector de carpetas. Usa Chrome o autoriza directamente con el servicio local.');
  const handle = await window.showDirectoryPicker({ mode: 'read', id: 'music-source' });
  return { handle, manifest: await summarize(handle) };
}
