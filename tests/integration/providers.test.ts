import { describe, expect, it, vi } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Catalog } from '../../apps/server/src/db/catalog.js';
import { MusicBrainzClient } from '../../apps/server/src/services/providers/musicbrainz.js';
import { identifyWithOpenAI } from '../../apps/server/src/services/providers/openai.js';
import { pickDirectoryMacOS } from '../../apps/server/src/platform/macos/folder-picker.js';

describe('provider and native boundaries', () => {
  it('requires MusicBrainz contact and caches successful lookups', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'mlo-providers-'));
    const catalog = new Catalog(path.join(dir, 'catalog.db'));
    expect(() => new MusicBrainzClient({ appName: 'MLO', appVersion: '0.1', contact: '', catalog })).toThrow(/contact/i);
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ recordings: [{ id: 'mbid', title: 'Jóga' }] }), { status: 200 }));
    const client = new MusicBrainzClient({ appName: 'MLO', appVersion: '0.1', contact: 'maintainer@example.test', catalog, fetch: fetcher, minIntervalMs: 1100 });
    expect(await client.searchRecording({ artist: 'Björk', title: 'Jóga' })).toMatchObject({ recordings: [{ id: 'mbid' }] });
    await client.searchRecording({ artist: 'Björk', title: 'Jóga' });
    expect(fetcher).toHaveBeenCalledTimes(1);
    catalog.close();
  });

  it('returns unavailable offline and validates OpenAI structured output', async () => {
    expect(await identifyWithOpenAI({ title: 'Unknown' }, {})).toEqual({ status: 'unavailable', reason: 'OPENAI_NOT_CONFIGURED' });
    const create = vi.fn(async () => ({ output_text: JSON.stringify({ status: 'identified', title: 'Jóga', artist: 'Björk', album: null, year: 1997, confidence: 88, sources: [] }) }));
    const result = await identifyWithOpenAI({ title: 'Joga' }, { apiKey: 'test-only', model: 'test-model', client: { responses: { create } } as never });
    expect(result).toMatchObject({ status: 'identified', title: 'Jóga', confidence: 88 });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ model: 'test-model', store: false, text: expect.objectContaining({ format: expect.objectContaining({ type: 'json_schema', strict: true }) }) }));
  });

  it('uses a fixed osascript program and execFile arguments', async () => {
    const execFile = vi.fn((_file: string, _args: string[], callback: (error: Error | null, stdout: string) => void) => callback(null, '/tmp/Chosen\n'));
    await expect(pickDirectoryMacOS({ execFile: execFile as never })).resolves.toBe('/tmp/Chosen');
    expect(execFile.mock.calls[0][0]).toBe('/usr/bin/osascript');
    expect(execFile.mock.calls[0][1]).toEqual(['-e', expect.stringContaining('choose folder')]);
  });
});
