import { afterEach, describe, expect, it } from 'vitest';
import { copyFile, mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildApp } from '../../apps/server/src/app.js';

const hosts = { host: '127.0.0.1:4888', origin: 'http://127.0.0.1:5173' };
const apps: Array<Awaited<ReturnType<typeof buildApp>>> = [];

async function fixture() {
  const home = await mkdtemp(path.join(tmpdir(), 'mlo-api-'));
  const source = path.join(home, 'source');
  const destination = path.join(home, 'destination');
  await mkdir(path.join(source, 'Björk', 'Debut'), { recursive: true });
  await mkdir(destination);
  const wav = Buffer.alloc(44 + 16);
  wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(16, 40);
  await writeFile(path.join(source, 'Björk', 'Debut', '01 - Human Behaviour.wav'), wav);
  await writeFile(path.join(source, 'broken.mp3'), 'not an mp3');
  const app = await buildApp({ dbPath: path.join(home, 'catalog.db'), allowedOrigins: [hosts.origin], allowPathInputForTests: true });
  apps.push(app);
  const paired = await app.inject({ method: 'POST', url: '/api/session/bootstrap', headers: hosts, payload: {} });
  expect(paired.statusCode).toBe(200);
  const cookie = paired.cookies[0]?.name + '=' + paired.cookies[0]?.value;
  const csrf = paired.json().csrfToken as string;
  const authHeaders = { ...hosts, cookie, 'x-csrf-token': csrf };
  return { home, source, destination, app, cookie, csrf, authHeaders };
}

afterEach(async () => { await Promise.all(apps.splice(0).map((app) => app.close())); });

describe('backend API vertical', () => {
  it('starts a local session without login while enforcing host/origin and CSRF', async () => {
    const { app, cookie } = await fixture();
    expect((await app.inject({ url: '/api/health', headers: { host: 'evil.example' } })).statusCode).toBe(403);
    const secondSession = await app.inject({ method: 'POST', url: '/api/session/bootstrap', headers: hosts, payload: {} });
    expect(secondSession.statusCode).toBe(200);
    const unauthorized = await app.inject({ url: '/api/tracks', headers: hosts });
    expect(unauthorized.statusCode).toBe(401);
    const noCsrf = await app.inject({ method: 'PATCH', url: '/api/settings', headers: { ...hosts, cookie }, payload: { mode: 'safe' } });
    expect(noCsrf.statusCode).toBe(403);
  });

  it('authorizes temp roots, scans metadata, and persists tracks/errors/settings', async () => {
    const { app, source, authHeaders } = await fixture();
    const root = await app.inject({ method: 'POST', url: '/api/roots/authorize', headers: authHeaders, payload: { path: source, role: 'source' } });
    expect(root.statusCode).toBe(201);
    const scan = await app.inject({ method: 'POST', url: '/api/scan', headers: authHeaders, payload: { rootId: root.json().id } });
    expect(scan.statusCode).toBe(200);
    expect(scan.json()).toMatchObject({ discovered: 2, imported: 1, errors: 1 });
    const tracks = await app.inject({ url: '/api/tracks?limit=10', headers: { ...hosts, cookie: authHeaders.cookie } });
    expect(tracks.json().items).toHaveLength(1);
    expect(tracks.body).not.toContain(source);
    expect(tracks.json().items[0]).toMatchObject({ title: '01 - Human Behaviour', format: 'WAVE', metadataSource: 'tags' });
    const identify = await app.inject({ method: 'POST', url: `/api/tracks/${tracks.json().items[0].id}/identify`, headers: authHeaders });
    expect(identify.json()).toMatchObject({ status: 'unidentified', reason: 'NO_RELIABLE_CANDIDATE' });
    const edited = await app.inject({ method: 'PATCH', url: `/api/tracks/${tracks.json().items[0].id}`, headers: authHeaders, payload: { title: 'Human Behaviour' } });
    expect(edited.json()).toMatchObject({ title: 'Human Behaviour', metadataSource: 'manual' });
    const stats = await app.inject({ url: '/api/stats', headers: { ...hosts, cookie: authHeaders.cookie } });
    expect(stats.json()).toMatchObject({ tracks: 1, errors: 1, favorites: 0 });
    expect((await app.inject({ method: 'PATCH', url: '/api/settings', headers: authHeaders, payload: { mode: 'safe', internetEnabled: false } })).statusCode).toBe(200);
    const savedKey = await app.inject({ method: 'POST', url: '/api/settings/openai-key', headers: authHeaders, payload: { apiKey: 'sk-test-only-not-real' } });
    expect(savedKey.json()).toEqual({ configured: true });
    const settingsView = await app.inject({ url: '/api/settings', headers: { ...hosts, cookie: authHeaders.cookie } });
    expect(settingsView.json()).toMatchObject({ openaiKeyConfigured: true });
    expect(settingsView.body).not.toContain('sk-test-only-not-real');
    expect((await app.inject({ method: 'PATCH', url: '/api/settings', headers: authHeaders, payload: { internetEnabled: {} } })).statusCode).toBe(400);
    expect((await app.inject({ method: 'PATCH', url: '/api/settings', headers: authHeaders, payload: { openaiModel: 'x'.repeat(200) } })).statusCode).toBe(400);
    expect((await app.inject({ url: '/api/settings', headers: { ...hosts, cookie: authHeaders.cookie } })).json()).toMatchObject({ mode: 'safe', internetEnabled: false });
    expect((await app.inject({ method: 'POST', url: '/api/maintenance/reset', headers: authHeaders })).statusCode).toBe(200);
    expect((await app.inject({ url: '/api/tracks', headers: authHeaders })).json()).toMatchObject({ total: 0, items: [] });
    expect((await app.inject({ url: '/api/roots', headers: authHeaders })).json()).toMatchObject({ roots: [] });
  });

  it('keeps playlists locked until a real library scan exists', async () => {
    const { app, authHeaders } = await fixture();
    const playlist = await app.inject({ method: 'POST', url: '/api/playlists', headers: authHeaders, payload: { name: 'Antes de escanear', rule: { kind: 'favorites' } } });
    expect(playlist.statusCode).toBe(423);
    expect(playlist.json()).toMatchObject({ error: 'SCAN_LIBRARY_FIRST' });
    expect((await app.inject({ url: '/api/playlists', headers: authHeaders })).statusCode).toBe(423);
  });

  it('hashes scanned audio and reports exact duplicate members', async () => {
    const { app, source, authHeaders } = await fixture();
    await writeFile(path.join(source, 'same-bytes.wav'), await readFile(path.join(source, 'Björk', 'Debut', '01 - Human Behaviour.wav')));
    const root = await app.inject({ method: 'POST', url: '/api/roots/authorize', headers: authHeaders, payload: { path: source, role: 'source' } });
    await app.inject({ method: 'POST', url: '/api/scan', headers: authHeaders, payload: { rootId: root.json().id } });
    const stats = await app.inject({ url: '/api/stats', headers: authHeaders });
    expect(stats.json()).toMatchObject({ duplicates: 2 });
    const searched = await app.inject({ url: '/api/tracks?q=same-bytes', headers: authHeaders });
    expect(searched.json()).toMatchObject({ total: 1 });
    expect(searched.json().items[0].originalFilename).toBe('same-bytes.wav');
  });

  it('marks removed source files absent on rescan', async () => {
    const { app, source, authHeaders } = await fixture();
    const root = (await app.inject({ method: 'POST', url: '/api/roots/authorize', headers: authHeaders, payload: { path: source, role: 'source' } })).json();
    await app.inject({ method: 'POST', url: '/api/scan', headers: authHeaders, payload: { rootId: root.id } });
    await rm(path.join(source, 'Björk', 'Debut', '01 - Human Behaviour.wav'));
    await app.inject({ method: 'POST', url: '/api/scan', headers: authHeaders, payload: { rootId: root.id } });
    expect((await app.inject({ url: '/api/tracks', headers: authHeaders })).json()).toMatchObject({ total: 0, items: [] });
  });

  it('previews, approves and applies an immutable copy-only plan, then exports favorites', async () => {
    const { app, source, destination, authHeaders } = await fixture();
    const authorize = async (rootPath: string, role: string) => (await app.inject({ method: 'POST', url: '/api/roots/authorize', headers: authHeaders, payload: { path: rootPath, role } })).json();
    const src = await authorize(source, 'source'); const dst = await authorize(destination, 'destination');
    await app.inject({ method: 'POST', url: '/api/scan', headers: authHeaders, payload: { rootId: src.id } });
    const track = (await app.inject({ url: '/api/tracks', headers: { ...hosts, cookie: authHeaders.cookie } })).json().items[0];
    const simulation = await app.inject({ method: 'POST', url: '/api/plans/preview', headers: authHeaders, payload: { sourceRootId: src.id, destinationRootId: dst.id, all: true, mode: 'simulation' } });
    expect(simulation.json().items).toHaveLength(1);
    const simApproved = await app.inject({ method: 'POST', url: `/api/plans/${simulation.json().id}/approve`, headers: authHeaders, payload: { revision: simulation.json().revision } });
    expect((await app.inject({ method: 'POST', url: `/api/plans/${simulation.json().id}/apply`, headers: authHeaders, payload: { revision: simApproved.json().revision } })).statusCode).toBe(409);
    const preview = await app.inject({ method: 'POST', url: '/api/plans/preview', headers: authHeaders, payload: { sourceRootId: src.id, destinationRootId: dst.id, trackIds: [track.id], mode: 'safe' } });
    expect(preview.statusCode).toBe(201);
    expect(preview.body).not.toContain(source); expect(preview.body).not.toContain(destination);
    expect(preview.json()).toMatchObject({ conflicts: 0 });
    expect(preview.json().items[0].targetRelativePath).toContain('Human Behaviour.wav');
    expect(await stat(destination)).toBeTruthy();
    expect((await app.inject({ method: 'POST', url: `/api/plans/${preview.json().id}/apply`, headers: authHeaders, payload: { revision: preview.json().revision } })).statusCode).toBe(409);
    expect((await app.inject({ method: 'POST', url: `/api/plans/${preview.json().id}/approve`, headers: authHeaders, payload: { revision: 999 } })).statusCode).toBe(409);
    const approved = await app.inject({ method: 'POST', url: `/api/plans/${preview.json().id}/approve`, headers: authHeaders, payload: { revision: preview.json().revision } });
    expect(approved.statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: `/api/plans/${preview.json().id}/apply`, headers: authHeaders, payload: { revision: preview.json().revision } })).statusCode).toBe(409);
    const applied = await app.inject({ method: 'POST', url: `/api/plans/${preview.json().id}/apply`, headers: authHeaders, payload: { revision: approved.json().revision } });
    expect(applied.json()).toMatchObject({ copied: 1, failed: 0 });
    const history = await app.inject({ url: '/api/history', headers: authHeaders });
    expect(history.json().items[0]).toMatchObject({ id: preview.json().id, state: 'applied', files: 1, verified: 1 });
    expect(applied.body).not.toContain(source); expect(applied.body).not.toContain(destination);
    const target = path.join(destination, preview.json().items[0].targetRelativePath);
    const original = path.join(source, track.originalPath);
    expect(await readFile(target)).toEqual(await readFile(original));
    expect((await app.inject({ method: 'PATCH', url: `/api/tracks/${track.id}/favorite`, headers: authHeaders, payload: { favorite: true } })).statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: '/api/playlists', headers: authHeaders, payload: { name: 'Sin regla', rule: {} } })).statusCode).toBe(400);
    const playlist = await app.inject({ method: 'POST', url: '/api/playlists', headers: authHeaders, payload: { name: 'Favoritas', rule: { kind: 'favorites' } } });
    expect(playlist.json()).toMatchObject({ count: 1 });
    const exported = await app.inject({ method: 'POST', url: `/api/playlists/${playlist.json().id}/export`, headers: authHeaders, payload: { destinationRootId: dst.id, format: 'm3u8' } });
    expect(exported.statusCode).toBe(201);
    expect(exported.body).not.toContain(destination);
    const m3u8 = await readFile(path.join(destination, exported.json().path), 'utf8');
    expect(m3u8).toContain('#EXTM3U');
    expect(m3u8).toContain('Human Behaviour.wav');
    const rollback = await app.inject({ method: 'POST', url: `/api/plans/${preview.json().id}/rollback`, headers: authHeaders });
    expect(rollback.json()).toMatchObject({ removed: 1, blocked: 0 });
    await expect(stat(target)).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await readFile(original)).toEqual(await readFile(path.join(source, 'Björk', 'Debut', '01 - Human Behaviour.wav')));
  });

  it('versions internal target collisions instead of blocking approval', async () => {
    const { app, source, destination, authHeaders } = await fixture();
    await mkdir(path.join(source, 'A')); await mkdir(path.join(source, 'B'));
    const fixtureAudio = path.join(source, 'Björk', 'Debut', '01 - Human Behaviour.wav');
    await copyFile(fixtureAudio, path.join(source, 'A', 'Collision.wav'));
    await copyFile(fixtureAudio, path.join(source, 'B', 'collision.wav'));
    const authorize = async (rootPath: string, role: string) => (await app.inject({ method: 'POST', url: '/api/roots/authorize', headers: authHeaders, payload: { path: rootPath, role } })).json();
    const src = await authorize(source, 'source'); const dst = await authorize(destination, 'destination');
    await app.inject({ method: 'POST', url: '/api/scan', headers: authHeaders, payload: { rootId: src.id } });
    const tracks = (await app.inject({ url: '/api/tracks?limit=100', headers: authHeaders })).json().items.filter((track: any) => track.originalFilename.toLowerCase() === 'collision.wav');
    const preview = await app.inject({ method: 'POST', url: '/api/plans/preview', headers: authHeaders, payload: { sourceRootId: src.id, destinationRootId: dst.id, trackIds: tracks.map((track: any) => track.id), mode: 'safe' } });
    expect(preview.json().conflicts).toBe(0);
    expect(new Set(preview.json().items.map((item: any) => item.targetRelativePath.toLowerCase())).size).toBe(2);
    expect(preview.json().items.some((item: any) => item.targetRelativePath.includes('versión'))).toBe(true);
    expect((await app.inject({ method: 'POST', url: `/api/plans/${preview.json().id}/approve`, headers: authHeaders, payload: { revision: 1 } })).statusCode).toBe(200);
  });

  it('approves plans with review conflicts and applies the safe subset', async () => {
    const { app, source, destination, authHeaders } = await fixture();
    const authorize = async (rootPath: string, role: string) => (await app.inject({ method: 'POST', url: '/api/roots/authorize', headers: authHeaders, payload: { path: rootPath, role } })).json();
    const src = await authorize(source, 'source'); const dst = await authorize(destination, 'destination');
    await app.inject({ method: 'POST', url: '/api/scan', headers: authHeaders, payload: { rootId: src.id } });
    const track = (await app.inject({ url: '/api/tracks', headers: authHeaders })).json().items[0];
    const previewClean = await app.inject({ method: 'POST', url: '/api/plans/preview', headers: authHeaders, payload: { sourceRootId: src.id, destinationRootId: dst.id, trackIds: [track.id], mode: 'safe' } });
    await mkdir(path.dirname(path.join(destination, previewClean.json().items[0].targetRelativePath)), { recursive: true });
    await writeFile(path.join(destination, previewClean.json().items[0].targetRelativePath), 'different recording');
    const preview = await app.inject({ method: 'POST', url: '/api/plans/preview', headers: authHeaders, payload: { sourceRootId: src.id, destinationRootId: dst.id, trackIds: [track.id], mode: 'safe' } });
    expect(preview.json()).toMatchObject({ conflicts: 1, executable: 0 });
    const approved = await app.inject({ method: 'POST', url: `/api/plans/${preview.json().id}/approve`, headers: authHeaders, payload: { revision: preview.json().revision } });
    expect(approved.statusCode).toBe(200);
    const applied = await app.inject({ method: 'POST', url: `/api/plans/${preview.json().id}/apply`, headers: authHeaders, payload: { revision: approved.json().revision } });
    expect(applied.statusCode).toBe(200);
    expect(applied.json()).toMatchObject({ copied: 0, skipped: 1, failed: 0 });
  });
});
