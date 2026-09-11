import type { AppSettings, HistoryEntry, Plan, Playlist, RootGrant, ScanJob, Stats, Track } from '../types';

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

const mapTrack = (item: any): Track => ({ id: item.id, originalTitle: item.originalFilename, title: item.title, artist: item.artist, album: item.album, year: item.year, genre: item.genre, trackNumber: item.trackNo, format: item.format ?? item.codec ?? 'Audio', quality: item.codec, confidence: item.title && item.artist ? 95 : item.title ? 72 : 35, source: item.metadataSource === 'tags' ? 'local' : item.metadataSource ?? null, status: item.title && item.artist ? 'Identificada' : 'Revisar', favorite: Boolean(item.favorite), originalPath: item.originalPath, finalPath: item.finalPath });
const planState = (status: string): Plan['state'] => status === 'preview' ? 'draft' : status === 'approved' ? 'approved' : status === 'applying' ? 'applying' : status === 'cancel_requested' ? 'cancel_requested' : status === 'cancelled' ? 'cancelled' : status === 'applied' ? 'completed' : 'stale';
const mapPlan = (raw: any, mode: AppSettings['mode']): Plan => ({ id: raw.id, revision: raw.revision ?? 1, state: planState(raw.status), mode, items: (raw.items ?? []).map((item: any) => ({ id: item.id, trackId: item.trackId, originalPath: item.sourcePath, destinationPath: item.targetRelativePath, selected: true, conflict: item.conflict ? 'Destino bloqueado: ya existe otro archivo distinto o varias canciones apuntan al mismo nombre. Cambia el metadato/nombre o usa otro destino.' : null, warning: item.warning ? 'Advertencia: el destino ya contiene el mismo archivo verificado por tamaño/hash; se puede aprobar y no se sobrescribirá.' : null })), estimatedBytes: (raw.items ?? []).reduce((sum: number, item: any) => sum + Number(item.sourceSize ?? 0), 0), excluded: 0, conflicts: Number(raw.conflicts ?? 0), warnings: Number(raw.warnings ?? 0), audit: raw.audit });
const defaults: AppSettings = { mode: 'simulation', updateTags: false, artwork: false, preserveArtwork: true, preferLossless: true, provider: { musicbrainzEnabled: false, openaiEnabled: false, webSearchEnabled: false, openaiConfigured: false, model: null, maxRequests: 100, maxWebRequests: 10 } };

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
  stats: async (): Promise<Stats> => { const s = await request<any>('/stats'); return { totalFiles: s.tracks + s.errors, audioFiles: s.tracks, artists: s.artists, albums: s.albums, genres: s.genres ?? 0, bytes: s.bytes, complete: s.complete ?? 0, incomplete: s.incomplete ?? 0, duplicates: s.duplicates ?? 0, unidentified: s.unidentified ?? 0, errors: s.errors, playlistsUnlocked: Boolean(s.playlistsUnlocked) }; },
  collection: (kind: 'artists' | 'albums' | 'genres') => request<{ items: Array<{ id: string; name: string; subtitle?: string; count: number }> }>(`/library/${kind}`),
  tracks: async (params: URLSearchParams) => { const raw = await request<{ items: any[]; total: number }>(`/tracks?${params}`); return { ...raw, items: raw.items.map(mapTrack) }; },
  patchTrack: async (id: string, changes: Partial<Track>) => mapTrack(await mutate<any>(`/tracks/${encodeURIComponent(id)}`, 'PATCH', changes)),
  identifyTrack: (id: string) => mutate<{ status: 'candidate' | 'unidentified'; source?: 'musicbrainz' | 'openai'; title?: string; artist?: string; album?: string | null; year?: number | null; confidence?: number; reason?: string }>(`/tracks/${encodeURIComponent(id)}/identify`, 'POST'),
  scan: async (rootId: string): Promise<ScanJob> => { const result = await mutate<any>('/scan', 'POST', { rootId }); return { id: result.jobId, state: 'completed', phase: 'Finalizado', discovered: result.discovered, processed: result.discovered, errors: result.errors, audit: result.audit }; },
  currentScan: () => request<ScanJob | null>('/scans/current'),
  scanAction: (id: string, action: 'pause' | 'resume' | 'cancel') => mutate<ScanJob>(`/scans/${encodeURIComponent(id)}/${action}`, 'POST'),
  plan: async () => { const raw = await request<any | null>('/plans/current'); return raw ? mapPlan(raw, raw.mode ?? 'safe') : null; },
  createPlan: async (destinationRootId: string, mode: AppSettings['mode']) => { const roots = await api.roots(); const source = roots.roots.find((root) => root.role === 'source'); if (!source) throw new Error('Autoriza primero una carpeta de origen'); const raw = await mutate<any>('/plans/preview', 'POST', { sourceRootId: source.id, destinationRootId, all: true, mode }); return mapPlan(raw, mode); },
  approvePlan: async (id: string, revision: number, mode: AppSettings['mode']) => mapPlan(await mutate<any>(`/plans/${encodeURIComponent(id)}/approve`, 'POST', { revision, mode }), mode),
  applyPlan: (id: string, revision: number) => mutate<{ jobId: string }>(`/plans/${encodeURIComponent(id)}/apply`, 'POST', { revision }),
  cancelPlan: (id: string) => mutate<{ id: string; status: string }>(`/plans/${encodeURIComponent(id)}/cancel`, 'POST'),
  settings: async (): Promise<AppSettings> => { const value = await request<any>('/settings'); return { ...defaults, mode: value.mode ?? defaults.mode, provider: { ...defaults.provider, musicbrainzEnabled: Boolean(value.internetEnabled), openaiEnabled: Boolean(value.openaiEnabled), openaiConfigured: Boolean(value.openaiConfigured), model: value.openaiModel ?? null } }; },
  saveSettings: async (settings: AppSettings) => { await mutate('/settings', 'PATCH', { mode: settings.mode, internetEnabled: settings.provider.musicbrainzEnabled, openaiEnabled: settings.provider.openaiEnabled, openaiModel: settings.provider.model }); return settings; },
  saveOpenAIKey: (apiKey: string) => mutate<{ configured: boolean }>('/settings/openai-key', 'POST', { apiKey }),
  playlists: () => request<{ items: Playlist[] }>('/playlists'),
  createPlaylist: async (name: string, rule: string) => { if (rule !== 'favorites') throw new Error('La regla aún no está certificada'); const raw = await mutate<any>('/playlists', 'POST', { name, rule: { favorite: true } }); return { id: raw.id, name: raw.name, rule, tracks: raw.count } as Playlist; },
  exportPlaylists: async (ids: string[], format: 'm3u8' | 'apple-xml') => { const roots = await api.roots(); const destination = roots.roots.find((root) => root.role === 'destination'); if (!destination) throw new Error('Autoriza primero un destino'); const files: string[] = []; for (const id of ids) { const result = await mutate<{ path: string }>(`/playlists/${encodeURIComponent(id)}/export`, 'POST', { destinationRootId: destination.id, format }); files.push(result.path); } return { files }; },
  history: () => request<{ items: HistoryEntry[] }>('/history'),
  rollbackPlan: (id: string) => mutate<{ removed: number; blocked: number }>(`/plans/${encodeURIComponent(id)}/rollback`, 'POST'),
};
