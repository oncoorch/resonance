export const AUDIO_EXTENSIONS = new Set(['mp3', 'm4a', 'aac', 'flac', 'alac', 'wav', 'aif', 'aiff', 'aifc', 'ogg', 'oga', 'opus']);

export interface BrowserManifestEntry { relativePath: string; file: File }
export interface BrowserManifest { files: number; audioFiles: number; bytes: number; sample: string[] }

export function buildBrowserManifest(entries: BrowserManifestEntry[]): BrowserManifest {
  return {
    files: entries.length,
    audioFiles: entries.filter(({ relativePath }) => AUDIO_EXTENSIONS.has(relativePath.split('.').pop()?.toLowerCase() ?? '')).length,
    bytes: entries.reduce((total, entry) => total + entry.file.size, 0),
    sample: entries.slice(0, 8).map((entry) => entry.relativePath),
  };
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: value >= 10 ? 1 : 2 }).format(value)} ${units[index]}`;
}

export type ConfidenceTone = 'alta' | 'media' | 'baja' | 'desconocida';
export function confidenceTone(value: number | null): ConfidenceTone {
  if (value === null) return 'desconocida';
  if (value >= 85) return 'alta';
  if (value >= 70) return 'media';
  return 'baja';
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return '—';
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${Math.round(seconds % 60).toString().padStart(2, '0')}`;
}

export function humanizePhase(phase?: string): string {
  const phases: Record<string, string> = {
    discovering: 'Descubriendo archivos', metadata: 'Leyendo metadatos', hashing: 'Calculando hashes',
    musicbrainz: 'Consultando MusicBrainz', matching: 'Resolviendo coincidencias', openai: 'Consultando OpenAI',
    preparing: 'Preparando biblioteca', copying: 'Copiando y verificando', complete: 'Completado', paused: 'En pausa',
  };
  return phases[phase ?? ''] ?? 'Preparando análisis';
}
