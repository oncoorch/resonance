import { describe, expect, it, vi } from 'vitest';
import { identifyTrackCandidate } from '../../apps/server/src/services/identify-track.js';

describe('pipeline de identificación', () => {
  it('prefiere coincidencia exacta de MusicBrainz y conserva evidencia', async () => {
    const musicBrainz = vi.fn(async () => ({ recordings: [{ id: 'mb-1', title: 'Jóga', score: 100, 'artist-credit': [{ name: 'Björk' }], releases: [{ title: 'Homogenic', date: '1997-09-22' }] }] }));
    const candidate = await identifyTrackCandidate({ title: 'Jóga', artist: 'Björk' }, { musicBrainz });
    expect(candidate).toMatchObject({ status: 'candidate', source: 'musicbrainz', title: 'Jóga', artist: 'Björk', confidence: 100, evidence: { providerId: 'mb-1' } });
  });

  it('usa OpenAI solo como fallback explícitamente habilitado', async () => {
    const openai = vi.fn(async () => ({ status: 'identified', title: 'Unknown', artist: 'Artist', album: null, year: null, confidence: 71, sources: [] }));
    const disabled = await identifyTrackCandidate({ title: 'Unknown' }, { openai, openaiEnabled: false });
    expect(disabled).toMatchObject({ status: 'unidentified' });
    expect(openai).not.toHaveBeenCalled();
    const enabled = await identifyTrackCandidate({ title: 'Unknown' }, { openai, openaiEnabled: true });
    expect(enabled).toMatchObject({ status: 'candidate', source: 'openai', confidence: 71 });
  });
});
