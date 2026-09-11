import type { AppSettings, HistoryEntry, Plan, PlanBuildJob, Playlist, RootGrant, ScanJob, Stats, Track } from '../types';

export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
let csrfToken = '';
let bootstrapPromise: Promise<{ csrfToken: string }> | null = null;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, { credentials: 'same-origin', ...init, headers: { 'Content-Type': 'application/json', ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}), ...init?.headers } });
  if (!response.ok) { const body = await response.json().catch(() => null) as { message?: string; error?: string } | null; throw new ApiError(response.status, body?.message ?? body?.error ?? `Error del servicio (${response.status})`); }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
const mutate = <T>(path: string, method: string, body?: unknown) => request<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });

const mapTrack = (item: any): Track => ({ id: item.id, originalTitle: item.originalFilename, title: item.title, artist: item.artist, album: item.album, year: item.year, genre: item.genre, trackNumber: item.trackNo, format: item.format ?? item.codec ?? 'Audio', quality: item.codec, confidence: item.title && item.artist ? 95 : item.title ? 72 : 35, source: item.metadataSource === 'tags' ? 'local' : item.metadataSource ?? null, status: item.title && item.artist ? 'Identificada' : 'Revisar', favorite: Boolean(item.favorite), originalPath: item.originalPath, finalPath: item.finalPath, sha256: item.sha256 });
const planState = (status: string): Plan['state'] => status === 'preview' ? 'draft' : status === 'approved' ? 'approved' : status === 'applying' ? 'applying' : status === 'cancel_requested' ? 'cancel_requested' : status === 'cancelled' ? 'cancelled' : status === 'applied' ? 'completed' : 'stale';
const mapPlan = (raw: any, mode: AppSettings['mode']): Plan => ({ id: raw.id, revision: raw.revision ?? 1, state: planState(raw.status), mode: raw.mode ?? mode, items: (raw.items ?? []).map((item: any) => ({ id: item.id, trackId: item.trackId, originalPath: item.sourcePath, destinationPath: item.targetRelativePath, selected: item.status !== 'conflict' && item.status !== 'review_pending', state: item.status, conflict: item.conflict ? 'Necesita decisión: ya existe un archivo distinto en destino. No bloquea la ejecución; queda para reemplazar, conservar o versionar.' : null, warning: item.warning ? (item.status === 'warning_versioned_variant' ? 'Versión automática: misma canción/nombre, se conserva como variante sin sobrescribir.' : 'Advertencia: el destino ya contiene el mismo archivo verificado por tamaño/hash; se aprobará sin duplicar.') : null })), estimatedBytes: (raw.items ?? []).filter((item: any) => item.status !== 'conflict' && item.status !== 'warning_existing_verified').reduce((sum: number, item: any) => sum + Number(item.sourceSize ?? 0), 0), excluded: Number(raw.skipped ?? 0), conflicts: Number(raw.conflicts ?? 0), warnings: Number(raw.warnings ?? 0), executable: Number(raw.executable ?? 0), skipped: Number(raw.skipped ?? 0), audit: raw.audit, space: raw.space });
const normalizeTheme = (value: any): AppSettings['theme'] => value === 'github-dark' || value === 'dracula' || value === 'tokyo' ? value : value === 'dark' ? 'tokyo' : 'light';
const defaults: AppSettings = { mode: 'simulation', updateTags: false, artwork: false, preserveArtwork: true, preferLossless: true, language: 'es', theme: 'light', provider: { musicbrainzEnabled: false, openaiEnabled: false, webSearchEnabled: false, openaiConfigured: false, model: null, maxRequests: 100, maxWebRequests: 10 } };

export const api = {
  health: () => request<{ ok: boolean; version?: string }>('/health'),
  bootstrap: async () => {
    bootstrapPromise ??= mutate<{ csrfToken: string }>('/session/bootstrap', 'POST', {}).then((result) => { csrfToken = result.csrfToken; return result; }).catch((error) => { bootstrapPromise = null; throw error; });
    return bootstrapPromise;
  },
  restoreSession: async () => { const result = await request<{ authenticated: boolean; csrfToken: string }>('/session'); csrfToken = result.csrfToken; return result; },
  roots: () => request<{ roots: RootGrant[] }>('/roots'),
  authorizeRoot: (role: RootGrant['role'], manifest?: unknown) => mutate<RootGrant>('/roots/pick', 'POST', { role, manifest }),
  revokeRoot: (id: string) => mutate<void>(`/roots/${encodeURIComponent(id)}`, 'DELETE'),
  stats: async (): Promise<Stats> => { const s = await request<any>('/stats'); const audioFiles = Number(s.tracks ?? 0); const duplicates = Number(s.duplicates ?? 0); return { totalFiles: audioFiles + Number(s.errors ?? 0), audioFiles, artists: s.artists, albums: s.albums, genres: s.genres ?? 0, bytes: s.bytes, complete: s.complete ?? 0, incomplete: s.incomplete ?? 0, duplicates, duplicatePercent: audioFiles ? Math.round((duplicates / audioFiles) * 1000) / 10 : 0, unidentified: s.unidentified ?? 0, errors: s.errors, playlistsUnlocked: Boolean(s.playlistsUnlocked) }; },
  collection: (kind: 'artists' | 'albums' | 'genres') => request<{ items: Array<{ id: string; name: string; subtitle?: string; count: number }> }>(`/library/${kind}`),
  tracks: async (params: URLSearchParams) => { const raw = await request<{ items: any[]; total: number }>(`/tracks?${params}`); return { ...raw, items: raw.items.map(mapTrack) }; },
  trackAudioUrl: (id: string) => `/api/tracks/${encodeURIComponent(id)}/audio`,
  patchTrack: async (id: string, changes: Partial<Track>) => mapTrack(await mutate<any>(`/tracks/${encodeURIComponent(id)}`, 'PATCH', changes)),
  deleteTrack: (id: string) => mutate<void>(`/tracks/${encodeURIComponent(id)}`, 'DELETE'),
  deleteTracks: (ids: string[]) => mutate<{ deleted: number; failed: number }>('/tracks/batch', 'POST', { ids }),
  identifyTrack: (id: string) => mutate<{ status: 'candidate' | 'unidentified'; source?: 'musicbrainz' | 'openai'; title?: string; artist?: string; album?: string | null; year?: number | null; confidence?: number; reason?: string }>(`/tracks/${encodeURIComponent(id)}/identify`, 'POST'),
  scan: async (rootId: string): Promise<ScanJob> => { const result = await mutate<any>('/scan', 'POST', { rootId }); return { id: result.jobId, state: result.state ?? 'running', phase: 'Descubriendo archivos', discovered: result.discovered ?? 0, processed: result.processed ?? 0, errors: result.errors ?? 0, audit: result.audit }; },
  currentScan: () => request<ScanJob | null>('/scans/current'),
  scanAction: (id: string, action: 'pause' | 'resume' | 'cancel') => mutate<ScanJob>(`/scans/${encodeURIComponent(id)}/${action}`, 'POST'),
  plan: async () => { const raw = await request<any | null>('/plans/current'); return raw ? mapPlan(raw, raw.mode ?? 'safe') : null; },
  createPlan: async (destinationRootId: string, mode: AppSettings['mode']) => { const roots = await api.roots(); const source = roots.roots.find((root) => root.role === 'source'); if (!source) throw new Error('Elige una carpeta de origen en esta pantalla antes de ejecutar'); const raw = await mutate<any>('/plans/preview', 'POST', { sourceRootId: source.id, destinationRootId, all: true, mode }); return mapPlan(raw, mode); },
  startPlanBuild: async (destinationRootId: string, mode: AppSettings['mode']) => { const roots = await api.roots(); const source = roots.roots.find((root) => root.role === 'source'); if (!source) throw new Error('Elige una carpeta de origen en esta pantalla antes de ejecutar'); return mutate<{ jobId: string }>('/plans/preview-jobs', 'POST', { sourceRootId: source.id, destinationRootId, all: true, mode }); },
  planBuild: async (id: string): Promise<PlanBuildJob> => { const raw = await request<any>(`/plans/preview-jobs/${encodeURIComponent(id)}`); return { ...raw, plan: raw.plan ? mapPlan(raw.plan, raw.plan.mode ?? 'safe') : undefined }; },
  cancelPlanBuild: (id: string) => mutate<{ id: string; state: string }>(`/plans/preview-jobs/${encodeURIComponent(id)}/cancel`, 'POST'),
  approvePlan: async (id: string, revision: number, mode: AppSettings['mode']) => mapPlan(await mutate<any>(`/plans/${encodeURIComponent(id)}/approve`, 'POST', { revision, mode }), mode),
  applyPlan: (id: string, revision: number) => mutate<{ jobId: string }>(`/plans/${encodeURIComponent(id)}/apply`, 'POST', { revision }),
  cancelPlan: (id: string) => mutate<{ id: string; status: string }>(`/plans/${encodeURIComponent(id)}/cancel`, 'POST'),
  settings: async (): Promise<AppSettings> => { const value = await request<any>('/settings'); return { ...defaults, mode: value.mode ?? defaults.mode, language: value.language === 'en' ? 'en' : 'es', theme: normalizeTheme(value.theme), provider: { ...defaults.provider, musicbrainzEnabled: Boolean(value.internetEnabled), openaiEnabled: Boolean(value.openaiEnabled), openaiConfigured: Boolean(value.openaiConfigured), model: value.openaiModel ?? null } }; },
  saveSettings: async (settings: AppSettings) => { await mutate('/settings', 'PATCH', { mode: settings.mode, language: settings.language, theme: settings.theme, internetEnabled: settings.provider.musicbrainzEnabled, openaiEnabled: settings.provider.openaiEnabled, openaiModel: settings.provider.model }); return settings; },
  saveOpenAIKey: (apiKey: string) => mutate<{ configured: boolean }>('/settings/openai-key', 'POST', { apiKey }),
  resetAll: () => mutate<{ ok: boolean }>('/maintenance/reset', 'POST'),
  playlists: () => request<{ items: Playlist[] }>('/playlists'),
  createPlaylist: async (name: string, rule: string, value?: string) => { const payloadRule = rule === 'favorites' ? { kind: 'favorites' } : rule === 'all' ? { kind: 'all' } : { kind: rule, value: value?.trim() }; const raw = await mutate<any>('/playlists', 'POST', { name, rule: payloadRule }); return { id: raw.id, name: raw.name, rule: raw.rule?.kind ?? rule, tracks: raw.count } as Playlist; },
  exportPlaylists: async (ids: string[], format: 'm3u8' | 'apple-xml') => { const roots = await api.roots(); const destination = roots.roots.find((root) => root.role === 'destination'); if (!destination) throw new Error('Autoriza primero un destino'); const files: string[] = []; for (const id of ids) { const result = await mutate<{ path: string }>(`/playlists/${encodeURIComponent(id)}/export`, 'POST', { destinationRootId: destination.id, format }); files.push(result.path); } return { files }; },
  history: () => request<{ items: HistoryEntry[] }>('/history'),
  rollbackPlan: (id: string) => mutate<{ removed: number; blocked: number }>(`/plans/${encodeURIComponent(id)}/rollback`, 'POST'),
};
