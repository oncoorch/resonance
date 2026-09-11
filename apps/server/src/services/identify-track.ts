type TrackHints = { title?: string | null; artist?: string | null; album?: string | null; originalFilename?: string | null };
type Options = {
  musicBrainz?: (query: { title: string; artist: string; album?: string }) => Promise<any>;
  openai?: (input: Record<string, unknown>) => Promise<any>;
  openaiEnabled?: boolean;
};

const key = (value: unknown) => typeof value === 'string' ? value.normalize('NFC').trim().toLocaleLowerCase() : '';

export async function identifyTrackCandidate(track: TrackHints, options: Options) {
  if (options.musicBrainz && track.title && track.artist) {
    try {
      const response = await options.musicBrainz({ title: track.title, artist: track.artist, ...(track.album ? { album: track.album } : {}) });
      const recording = Array.isArray(response?.recordings) ? response.recordings.find((item: any) => key(item.title) === key(track.title) && key(item['artist-credit']?.[0]?.name) === key(track.artist)) : undefined;
      if (recording) return { status: 'candidate' as const, source: 'musicbrainz' as const, title: recording.title, artist: recording['artist-credit'][0].name, album: recording.releases?.[0]?.title ?? null, year: Number.parseInt(recording.releases?.[0]?.date?.slice(0,4),10) || null, confidence: Math.max(0, Math.min(100, Number(recording.score) || 0)), evidence: { providerId: recording.id, query: { title: track.title, artist: track.artist } } };
    } catch { /* provider failure is isolated; optional fallback remains available */ }
  }
  if (options.openaiEnabled && options.openai) {
    const result = await options.openai({ title: track.title, artist: track.artist, album: track.album, filename: track.originalFilename });
    if (result?.status === 'identified') return { status: 'candidate' as const, source: 'openai' as const, title: result.title, artist: result.artist, album: result.album, year: result.year, confidence: result.confidence, evidence: { sources: result.sources ?? [] } };
  }
  return { status: 'unidentified' as const, reason: 'NO_RELIABLE_CANDIDATE' as const };
}
