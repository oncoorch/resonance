export type ViewId = 'library' | 'tracks' | 'artists' | 'albums' | 'genres' | 'duplicates' | 'unidentified' | 'playlists' | 'history' | 'settings' | 'organization';
export type Mode = 'simulation' | 'safe' | 'organize';

export interface RootGrant { id: string; path: string; role: 'source' | 'destination'; authorized?: boolean }
export interface Stats {
  totalFiles: number; audioFiles: number; artists: number; albums: number; genres: number; bytes: number;
  complete: number; incomplete: number; duplicates: number; unidentified: number; errors: number; playlistsUnlocked: boolean;
}
export interface Track {
  id: string; originalTitle: string; title: string | null; artist: string | null; album: string | null;
  year: number | null; genre: string | null; trackNumber: number | null; format: string; quality: string | null;
  confidence: number | null; source: 'local' | 'path' | 'musicbrainz' | 'openai' | 'manual' | null;
  status: string; favorite: boolean; originalPath?: string; finalPath?: string;
}
export interface ScanAudit { directories?: number; entries?: number; audioFiles?: number; nonAudioFiles?: number; audioBytes?: number; totalBytes?: number }
export interface ScanJob { id: string; state: 'queued' | 'running' | 'paused' | 'cancel_requested' | 'cancelled' | 'completed' | 'failed'; phase?: string; discovered: number; processed: number; errors: number; audit?: ScanAudit }
export interface PlanItem { id: string; trackId: string; originalPath: string; destinationPath: string; selected: boolean; state?: string; conflict?: string | null; warning?: string | null; tagChanges?: Array<{ field: string; from: string | null; to: string | null }> }
export interface Plan { id: string; revision: number; state: 'draft' | 'approved' | 'applying' | 'completed' | 'stale' | 'cancel_requested' | 'cancelled'; mode: Mode; items: PlanItem[]; estimatedBytes: number; excluded: number; conflicts: number; warnings?: number; audit?: ScanAudit }
export interface PlanBuildJob { id: string; state: 'queued' | 'running' | 'completed' | 'cancelled' | 'failed'; phase: string; processed: number; total: number; current?: string; conflicts?: number; warnings?: number; error?: string; plan?: Plan }
export interface ProviderSettings { musicbrainzEnabled: boolean; openaiEnabled: boolean; webSearchEnabled: boolean; openaiConfigured: boolean; model: string | null; maxRequests: number; maxWebRequests: number }
export type Language = 'es' | 'en';
export type Theme = 'light' | 'dark';
export interface AppSettings { mode: Mode; updateTags: boolean; artwork: boolean; preserveArtwork: boolean; preferLossless: boolean; language: Language; theme: Theme; provider: ProviderSettings }
export interface Playlist { id: string; name: string; rule: string; tracks: number; updatedAt?: string }
export interface HistoryEntry { id: string; type: string; state: string; createdAt: string; files: number; verified: number; rollbackAvailable?: boolean }

export const EMPTY_STATS: Stats = { totalFiles: 0, audioFiles: 0, artists: 0, albums: 0, genres: 0, bytes: 0, complete: 0, incomplete: 0, duplicates: 0, unidentified: 0, errors: 0, playlistsUnlocked: false };
