import { createHash } from 'node:crypto';
import type { Catalog } from '../../db/catalog.js';

export interface MusicBrainzOptions {
  appName: string; appVersion: string; contact: string; catalog: Catalog;
  fetch?: typeof globalThis.fetch; minIntervalMs?: number; timeoutMs?: number;
}

let globalLastRequest = 0;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class MusicBrainzClient {
  private readonly fetcher: typeof globalThis.fetch;
  private readonly minIntervalMs: number;
  constructor(private readonly options: MusicBrainzOptions) {
    if (!options.contact.trim()) throw new Error('MusicBrainz requiere un contact real');
    this.fetcher = options.fetch ?? globalThis.fetch;
    this.minIntervalMs = options.minIntervalMs ?? 1100;
  }
  async searchRecording(query: { artist: string; title: string; album?: string }): Promise<any> {
    const cacheKey = createHash('sha256').update(JSON.stringify(query)).digest('hex');
    const cached = this.options.catalog.cacheGet('musicbrainz', cacheKey);
    if (cached !== undefined) return cached;
    const elapsed = Date.now() - globalLastRequest;
    if (elapsed < this.minIntervalMs) await sleep(this.minIntervalMs - elapsed);
    globalLastRequest = Date.now();
    const terms = [`artist:${JSON.stringify(query.artist)}`, `recording:${JSON.stringify(query.title)}`];
    if (query.album) terms.push(`release:${JSON.stringify(query.album)}`);
    const url = new URL('https://musicbrainz.org/ws/2/recording');
    url.searchParams.set('query', terms.join(' AND ')); url.searchParams.set('fmt', 'json'); url.searchParams.set('limit', '25');
    const response = await this.fetcher(url, { headers: { 'User-Agent': `${this.options.appName}/${this.options.appVersion} (${this.options.contact})`, Accept: 'application/json' }, signal: AbortSignal.timeout(this.options.timeoutMs ?? 15_000) });
    if (!response.ok) throw Object.assign(new Error(`MusicBrainz HTTP ${response.status}`), { status: response.status });
    const text = await response.text(); if (text.length > 1_000_000) throw new Error('Respuesta MusicBrainz demasiado grande');
    const value = JSON.parse(text);
    this.options.catalog.cachePut('musicbrainz', cacheKey, value, 30 * 24 * 60 * 60 * 1000);
    return value;
  }
}
