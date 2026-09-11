import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import { randomBytes, randomUUID } from 'node:crypto';
import { lstat, stat, statfs } from 'node:fs/promises';
import path from 'node:path';
import { Catalog } from './db/catalog.js';
import { RootGrants, type RootRole } from './security/root-grants.js';
import { scanAudioFiles } from './services/scanner.js';
import { readTrackMetadata } from './services/metadata.js';
import { copyVerifiedNoClobber, hasSufficientSpace, removeVerifiedFile, sha256File, sourceSnapshotMatches, writeTextNoClobber } from './services/filesystem.js';
import { exportAppleXml, exportM3U8 } from './services/playlists.js';
import { pickDirectoryMacOS } from './platform/macos/folder-picker.js';
import { MusicBrainzClient } from './services/providers/musicbrainz.js';
import { identifyWithOpenAI } from './services/providers/openai.js';
import { identifyTrackCandidate } from './services/identify-track.js';
import { verifyDirectoryCoherence } from './services/directory-coherence.js';
import { buildTargetRelativePath } from './services/organization-naming.js';

export interface AppOptions {
  dbPath: string; allowedOrigins?: string[]; allowedHosts?: string[];
  allowPathInputForTests?: boolean; nodeEnv?: string;
  pickDirectory?: () => Promise<string>;
}

type Body = Record<string, any>;
const mutating = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const cleanSegment = (value: string) => {
  const printable = [...value.normalize('NFC')].filter((char) => { const code = char.codePointAt(0) ?? 0; return code >= 32 && code !== 127; }).join('');
  return printable.replace(/[\\/]/g, '／').replace(/^\.+|[. ]+$/g, '').slice(0, 160) || 'Sin nombre';
};
const safeErrorCode = (error: unknown, fallback: string) => typeof (error as any)?.code === 'string' ? (error as any).code : ['TRACK_OUTSIDE_SOURCE','TRACK_NOT_FOUND','SOURCE_CAPABILITY_MISMATCH','SOURCE_CHANGED'].includes((error as Error)?.message) ? (error as Error).message : fallback;
const trackTarget = (track: any) => {
  return buildTargetRelativePath(track);
};
const foundAudit = (catalog: Catalog, rootId: string) => catalog.db.prepare('SELECT count(*) audioFiles,coalesce(sum(bytes),0) audioBytes FROM tracks WHERE root_id=? AND present=1').get(rootId);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function buildApp(options: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: false, bodyLimit: 1024 * 1024 });
  await app.register(cookie);
  const catalog = new Catalog(options.dbPath);
  const grants = new RootGrants();
  const sessions = new Map<string, string>();
  let runtimeOpenAIKey = process.env.OPENAI_API_KEY?.trim() ?? '';
  const planBuildJobs = new Map<string, { id: string; state: 'queued' | 'running' | 'completed' | 'cancelled' | 'failed'; phase: string; processed: number; total: number; current?: string; conflicts?: number; warnings?: number; error?: string; plan?: any }>();

  const origins = new Set(options.allowedOrigins ?? ['http://127.0.0.1:4173', 'http://127.0.0.1:4174', 'http://127.0.0.1:5173', 'http://resonance.local:4888']);
  const hosts = new Set(options.allowedHosts ?? ['127.0.0.1:4174', 'localhost:4174', '127.0.0.1:4888', 'localhost:4888', 'resonance.local:4888']);
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV ?? 'development';
  const allowPathInput = options.allowPathInputForTests ?? (nodeEnv === 'test' || process.env.ALLOW_PATH_INPUT_FOR_TESTS === '1');

  app.addHook('onClose', async () => catalog.close());
  app.addHook('onRequest', async (request, reply) => {
    const host = request.headers.host ?? '';
    if (!hosts.has(host)) { await reply.code(403).send({ error: 'HOST_NOT_ALLOWED' }); return; }
    const origin = request.headers.origin;
    if (origin && !origins.has(origin)) { await reply.code(403).send({ error: 'ORIGIN_NOT_ALLOWED' }); return; }
    if (!request.url.startsWith('/api/') || request.url === '/api/health' || request.url === '/api/session/bootstrap') return;
    const sessionId = request.cookies.mlo_session;
    const csrf = sessionId ? sessions.get(sessionId) : undefined;
    if (!sessionId || !csrf) { await reply.code(401).send({ error: 'SESSION_REQUIRED' }); return; }
    if (mutating.has(request.method) && request.headers['x-csrf-token'] !== csrf) { await reply.code(403).send({ error: 'CSRF_INVALID' }); }
  });

  app.get('/api/health', async () => ({ ok: true, service: 'music-library-organizer' }));
  app.post('/api/session/bootstrap', async (_request, reply) => {
    const sessionId = randomBytes(32).toString('base64url'); const csrfToken = randomBytes(32).toString('base64url');
    sessions.set(sessionId, csrfToken);
    reply.setCookie('mlo_session', sessionId, { httpOnly: true, sameSite: 'strict', path: '/', secure: false });
    return { csrfToken };
  });
  app.get('/api/session', async (request) => ({ authenticated: true, csrfToken: sessions.get(request.cookies.mlo_session!) }));

  const storeGrant = async (selectedPath: string, role: RootRole) => {
    const grant = await grants.authorize(selectedPath, role); catalog.addRoot(grant); return grant;
 };
 const publicGrant = (grant: ReturnType<typeof grants.get>) => grant && ({ id: grant.id, role: grant.role, path: path.basename(grant.path), createdAt: grant.createdAt });
 const publicTrack = (track: any) => track && ({ ...track, originalPath: track.relativePath, finalPath: track.finalPath ? path.basename(track.finalPath) : null });
  app.post('/api/roots/pick', async (request, reply) => {
    const body = request.body as Body; const role = body?.role;
    if (role !== 'source' && role !== 'destination') return reply.code(400).send({ error: 'ROLE_INVALID' });
    try { const selected = await (options.pickDirectory ?? (() => pickDirectoryMacOS()))(); if (body.manifest !== undefined) await verifyDirectoryCoherence(selected, body.manifest as any); return reply.code(201).send(publicGrant(await storeGrant(selected, role))); }
    catch (error) { return reply.code((error as any)?.code === 'CANCELLED' ? 400 : 500).send({ error: (error as Error).message }); }
  });
  if (allowPathInput) app.post('/api/roots/authorize', async (request, reply) => {
    const body = request.body as Body;
    if (typeof body?.path !== 'string' || (body.role !== 'source' && body.role !== 'destination')) return reply.code(400).send({ error: 'ROOT_INVALID' });
    try { return reply.code(201).send(publicGrant(await storeGrant(body.path, body.role))); }
    catch (error) { return reply.code(400).send({ error: (error as Error).message }); }
  });
  app.get('/api/roots', async () => ({ roots: grants.list().map((grant) => publicGrant(grant)) }));
  app.delete('/api/roots/:id', async (request, reply) => { grants.revoke((request.params as Body).id); return reply.code(204).send(); });

  app.post('/api/scan', async (request, reply) => {
    const rootId = (request.body as Body)?.rootId; const root = grants.get(rootId);
    if (!root || root.role !== 'source') return reply.code(404).send({ error: 'SOURCE_ROOT_NOT_AUTHORIZED' });
    const jobId = catalog.createJob(rootId);
    if (allowPathInput) {
      const found = await scanAudioFiles(root.path); let imported = 0; let errors = found.errors.length;
      catalog.db.prepare('UPDATE tracks SET present=0 WHERE root_id=?').run(rootId);
      for (const scanFile of found.files) {
        try { const metadata = await readTrackMetadata(scanFile.absolutePath); const trackId = catalog.upsertTrack({ rootId, relativePath: scanFile.relativePath, originalPath: scanFile.absolutePath, originalFilename: path.basename(scanFile.absolutePath), bytes: scanFile.size, mtimeMs: scanFile.mtimeMs, ...metadata }); catalog.db.prepare('UPDATE tracks SET sha256=? WHERE id=?').run(await sha256File(scanFile.absolutePath), trackId); imported += 1; }
        catch (error) { errors += 1; catalog.addError(jobId, scanFile.absolutePath, error instanceof Error ? error.message : String(error)); }
      }
      for (const error of found.errors) catalog.addError(jobId, error.path, error.message);
      catalog.db.prepare('UPDATE jobs SET discovered=?,processed=?,errors=?,status=?,finished_at=? WHERE id=?').run(found.files.length, imported + errors - found.errors.length, errors, 'completed', new Date().toISOString(), jobId);
      return { jobId, discovered: found.files.length, imported, errors, audit: found.summary };
    }
    void (async () => {
      try {
        const found = await scanAudioFiles(root.path); let imported = 0; let errors = found.errors.length;
        catalog.db.prepare('UPDATE tracks SET present=0 WHERE root_id=?').run(rootId);
        catalog.db.prepare('UPDATE jobs SET discovered=?,processed=0 WHERE id=?').run(found.files.length, jobId);
        for (const scanFile of found.files) {
          let state = (catalog.db.prepare('SELECT status FROM jobs WHERE id=?').get(jobId) as any)?.status;
          while (state === 'paused') { await sleep(350); state = (catalog.db.prepare('SELECT status FROM jobs WHERE id=?').get(jobId) as any)?.status; }
          if (state === 'cancelled') break;
          try {
            const metadata = await readTrackMetadata(scanFile.absolutePath);
            const trackId = catalog.upsertTrack({ rootId, relativePath: scanFile.relativePath, originalPath: scanFile.absolutePath, originalFilename: path.basename(scanFile.absolutePath), bytes: scanFile.size, mtimeMs: scanFile.mtimeMs, ...metadata });
            catalog.db.prepare('UPDATE tracks SET sha256=? WHERE id=?').run(await sha256File(scanFile.absolutePath), trackId); imported += 1;
          } catch (error) { errors += 1; catalog.addError(jobId, scanFile.absolutePath, error instanceof Error ? error.message : String(error)); }
          catalog.db.prepare('UPDATE jobs SET processed=?,errors=? WHERE id=?').run(imported + errors - found.errors.length, errors, jobId);
        }
        for (const error of found.errors) catalog.addError(jobId, error.path, error.message);
        const finalState = (catalog.db.prepare('SELECT status FROM jobs WHERE id=?').get(jobId) as any)?.status === 'cancelled' ? 'cancelled' : 'completed';
        catalog.db.prepare('UPDATE jobs SET status=?,errors=?,finished_at=? WHERE id=?').run(finalState, errors, new Date().toISOString(), jobId);
      } catch (error) { catalog.db.prepare("UPDATE jobs SET status='failed',errors=errors+1,finished_at=? WHERE id=?").run(new Date().toISOString(), jobId); catalog.addError(jobId, root.path, error instanceof Error ? error.message : String(error)); }
    })();
    return { jobId, state: 'running', discovered: 0, processed: 0, errors: 0 };
  });

  app.get('/api/tracks', async (request) => {
    const query = request.query as Body; const limit = Math.min(Math.max(Number(query.limit) || 100, 1), 500); const offset = Math.max(Number(query.offset) || 0, 0);
    const result = catalog.queryTracks({ q: typeof query.q === 'string' ? query.q : undefined, filter: typeof query.filter === 'string' ? query.filter : undefined, sort: typeof query.sort === 'string' ? query.sort : undefined, limit, offset });
    return { ...result, items: result.items.map(publicTrack), limit, offset };
  });
  app.patch('/api/tracks/:id', async (request, reply) => {
    const id = (request.params as Body).id; const body = request.body as Body; const current = catalog.track(id);
    if (!current) return reply.code(404).send({ error: 'TRACK_NOT_FOUND' });
    const allowed = ['title', 'artist', 'album', 'genre'] as const;
    if (Object.keys(body ?? {}).some((key) => ![...allowed, 'favorite'].includes(key as any))) return reply.code(400).send({ error: 'TRACK_CHANGE_INVALID' });
    for (const key of allowed) if (body[key] !== undefined) { if (body[key] !== null && typeof body[key] !== 'string') return reply.code(400).send({ error: 'TRACK_CHANGE_INVALID' }); catalog.db.prepare(`UPDATE tracks SET ${key}=? WHERE id=?`).run(body[key], id); }
    if (allowed.some((key) => body[key] !== undefined)) catalog.db.prepare("UPDATE tracks SET metadata_source='manual' WHERE id=?").run(id);
    if (body.favorite !== undefined) { if (typeof body.favorite !== 'boolean') return reply.code(400).send({ error: 'FAVORITE_INVALID' }); catalog.setFavorite(id, body.favorite); }
    return publicTrack(catalog.track(id));
  });
  app.post('/api/tracks/:id/identify', async (request, reply) => {
    const track = catalog.track((request.params as Body).id); if (!track) return reply.code(404).send({ error: 'TRACK_NOT_FOUND' });
    const settings = catalog.settings(); const contact = typeof settings.musicBrainzContact === 'string' && settings.musicBrainzContact ? settings.musicBrainzContact : (process.env.MUSICBRAINZ_CONTACT ?? '');
    let musicBrainz: ((query: { artist: string; title: string; album?: string }) => Promise<any>) | undefined;
    if (settings.internetEnabled === true && contact) { const client = new MusicBrainzClient({ appName: 'RESONANCE', appVersion: '0.1.0', contact, catalog }); musicBrainz = (query) => client.searchRecording(query); }
    return identifyTrackCandidate(track, { musicBrainz, openaiEnabled: settings.openaiEnabled === true && Boolean(runtimeOpenAIKey), openai: (input) => identifyWithOpenAI(input, { apiKey: runtimeOpenAIKey, model: typeof settings.openaiModel === 'string' ? settings.openaiModel : process.env.OPENAI_MODEL }) });
  });
  app.patch('/api/tracks/:id/favorite', async (request, reply) => {
    const value = (request.body as Body)?.favorite;
    if (typeof value !== 'boolean') return reply.code(400).send({ error: 'FAVORITE_INVALID' });
    if (!catalog.setFavorite((request.params as Body).id, value)) return reply.code(404).send({ error: 'TRACK_NOT_FOUND' });
    return publicTrack(catalog.track((request.params as Body).id));
  });
  app.get('/api/stats', async () => {
    const stats = catalog.stats();
    const extra = catalog.db.prepare("SELECT count(DISTINCT genre) genres,sum(CASE WHEN title IS NOT NULL AND artist IS NOT NULL THEN 1 ELSE 0 END) complete,sum(CASE WHEN title IS NULL OR artist IS NULL THEN 1 ELSE 0 END) incomplete,sum(CASE WHEN title IS NULL OR artist IS NULL THEN 1 ELSE 0 END) unidentified FROM tracks WHERE present=1").get() as any;
    const duplicateRows = catalog.db.prepare('SELECT count(*) count FROM tracks WHERE present=1 AND sha256 IN (SELECT sha256 FROM tracks WHERE present=1 AND sha256 IS NOT NULL GROUP BY sha256 HAVING count(*)>1)').get() as any;
    const playlistsUnlocked = Number((catalog.db.prepare("SELECT count(*) count FROM organization_plans WHERE status='applied'").get() as any).count) > 0;
    return { ...stats, genres: extra.genres, complete: extra.complete ?? 0, incomplete: extra.incomplete ?? 0, unidentified: extra.unidentified ?? 0, duplicates: duplicateRows.count ?? 0, playlistsUnlocked };
  });
  app.get('/api/library/:kind', async (request, reply) => {
    const kind = (request.params as Body).kind; const column = kind === 'artists' ? 'artist' : kind === 'albums' ? 'album' : kind === 'genres' ? 'genre' : null;
    if (!column) return reply.code(404).send({ error: 'COLLECTION_NOT_FOUND' });
    const rows = catalog.db.prepare(`SELECT ${column} name,count(*) count FROM tracks WHERE present=1 AND ${column} IS NOT NULL AND ${column}<>'' GROUP BY ${column} ORDER BY ${column} COLLATE NOCASE LIMIT 1000`).all() as any[];
    return { items: rows.map((row) => ({ id: `${kind}:${row.name}`, name: row.name, count: row.count })) };
  });
  app.get('/api/scans/current', async () => {
    const row = catalog.db.prepare("SELECT * FROM jobs WHERE type='scan' ORDER BY created_at DESC LIMIT 1").get() as any;
    return row ? { id: row.id, state: row.status, phase: row.status === 'completed' ? 'Finalizado' : row.discovered ? 'Analizando metadatos' : 'Descubriendo archivos', discovered: row.discovered, processed: row.processed, errors: row.errors, audit: foundAudit(catalog, row.root_id) } : null;
  });
  app.post('/api/scans/:id/:action', async (request, reply) => {
    const { id, action } = request.params as Body; if (!['pause','resume','cancel'].includes(action)) return reply.code(400).send({ error: 'ACTION_INVALID' });
    const row = catalog.db.prepare('SELECT * FROM jobs WHERE id=?').get(id) as any; if (!row) return reply.code(404).send({ error: 'JOB_NOT_FOUND' });
    if (row.status === 'completed' || row.status === 'failed') return reply.code(409).send({ error: 'JOB_ALREADY_FINISHED' });
    const state = action === 'pause' ? 'paused' : action === 'resume' ? 'running' : 'cancelled'; catalog.db.prepare('UPDATE jobs SET status=? WHERE id=?').run(state,id);
    return { id, state, discovered: row.discovered, processed: row.processed, errors: row.errors };
  });
  app.get('/api/settings', async () => ({ ...catalog.settings(), openaiConfigured: Boolean(runtimeOpenAIKey), openaiKeyConfigured: Boolean(runtimeOpenAIKey) }));
  app.post('/api/settings/openai-key', async (request, reply) => {
    const apiKey = (request.body as Body)?.apiKey;
    if (typeof apiKey !== 'string' || apiKey.length > 512 || /[\r\n]/.test(apiKey)) return reply.code(400).send({ error: 'OPENAI_KEY_INVALID' });
    runtimeOpenAIKey = apiKey.trim();
    return { configured: Boolean(runtimeOpenAIKey) };
  });
  app.patch('/api/settings', async (request, reply) => {
    const allowed = new Set(['mode', 'internetEnabled', 'openaiEnabled', 'openaiModel', 'musicBrainzContact', 'language', 'theme']); const body = request.body as Body;
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some((key) => !allowed.has(key))) return reply.code(400).send({ error: 'SETTING_INVALID' });
    if (body.mode !== undefined && !['simulation', 'safe'].includes(body.mode)) return reply.code(400).send({ error: 'MODE_INVALID' });
    if (body.language !== undefined && !['es', 'en'].includes(body.language)) return reply.code(400).send({ error: 'LANGUAGE_INVALID' });
    if (body.theme !== undefined && !['light', 'dark'].includes(body.theme)) return reply.code(400).send({ error: 'THEME_INVALID' });
    for (const key of ['internetEnabled','openaiEnabled']) if (body[key] !== undefined && typeof body[key] !== 'boolean') return reply.code(400).send({ error: 'SETTING_INVALID' });
    for (const key of ['openaiModel','musicBrainzContact']) if (body[key] !== undefined && body[key] !== null && (typeof body[key] !== 'string' || body[key].length < 1 || body[key].length > 128)) return reply.code(400).send({ error: 'SETTING_INVALID' });
    return catalog.updateSettings(body);
  });
  app.post('/api/maintenance/reset', async () => {
    catalog.resetAll(); grants.clear(); runtimeOpenAIKey = '';
    return { ok: true };
  });

  app.post('/api/plans/preview', async (request, reply) => {
    const body = request.body as Body; const source = grants.get(body.sourceRootId); const destination = grants.get(body.destinationRootId);
    if (!source || source.role !== 'source' || !destination || destination.role !== 'destination') return reply.code(400).send({ error: 'ROOTS_INVALID' });
    const trackIds = body.all === true ? (catalog.db.prepare('SELECT id FROM tracks WHERE root_id=? AND present=1 ORDER BY relative_path').all(source.id) as Array<{ id: string }>).map((row) => row.id) : Array.isArray(body.trackIds) ? [...new Set(body.trackIds.filter((id): id is string => typeof id === 'string'))] : [];
    if (!trackIds.length) return reply.code(400).send({ error: 'TRACKS_REQUIRED' });
    const mode = body.mode; if (!['simulation', 'safe'].includes(mode)) return reply.code(400).send({ error: 'PLAN_MODE_INVALID' });
    const id = randomUUID(); const now = new Date().toISOString();
    const insertPlan = catalog.db.prepare("INSERT INTO organization_plans(id,source_root_id,destination_root_id,status,mode,manifest_json,created_at) VALUES (?,?,?,'preview',?,?,?)");
    const insertItem = catalog.db.prepare('INSERT INTO plan_items(id,plan_id,track_id,source_path,target_relative_path,source_size,source_mtime_ms,source_hash,status) VALUES (?,?,?,?,?,?,?,?,?)');
    const items: any[] = [];
    try {
      for (const trackId of trackIds) {
        const track = catalog.track(trackId); if (!track || track.rootId !== source.id) throw new Error('TRACK_OUTSIDE_SOURCE');
        const targetRelativePath = trackTarget(track); const sourceHash = await sha256File(track.originalPath);
        const item = { id: randomUUID(), trackId, sourcePath: track.originalPath, targetRelativePath, sourceSize: track.bytes, sourceMtimeMs: track.mtimeMs, sourceHash, status: 'planned' };
        try {
          const existing = await lstat(path.join(destination.path, targetRelativePath));
          if (existing.isFile() && existing.size === track.bytes && await sha256File(path.join(destination.path, targetRelativePath)) === sourceHash) item.status = 'warning_existing_verified';
          else item.status = 'conflict';
        } catch (error: any) { if (error.code !== 'ENOENT') throw error; }
        items.push(item);
      }
      const targetCounts = new Map<string, number>(); for (const item of items) { const key = item.targetRelativePath.normalize('NFC').toLocaleLowerCase(); targetCounts.set(key, (targetCounts.get(key) ?? 0) + 1); }
      for (const item of items) if ((targetCounts.get(item.targetRelativePath.normalize('NFC').toLocaleLowerCase()) ?? 0) > 1) item.status = 'conflict';
      const conflicts = items.filter((item) => item.status === 'conflict').length; const warnings = items.filter((item) => item.status.startsWith('warning_')).length;
      const manifest = JSON.stringify({ mode, conflicts, warnings, audit: foundAudit(catalog, source.id), rulesVersion: 2, generatedAt: now });
      catalog.db.transaction(() => { insertPlan.run(id, source.id, destination.id, mode, manifest, now); for (const item of items) insertItem.run(item.id,id,item.trackId,item.sourcePath,item.targetRelativePath,item.sourceSize,item.sourceMtimeMs,item.sourceHash,item.status); })();
    } catch (error) { return reply.code(400).send({ error: safeErrorCode(error, 'PLAN_PREVIEW_FAILED') }); }
    return reply.code(201).send({ id, status: 'preview', revision: 1, mode, conflicts: items.filter((item) => item.status === 'conflict').length, warnings: items.filter((item) => item.status.startsWith('warning_')).length, items: items.map((item) => ({ id: item.id, trackId: item.trackId, sourcePath: catalog.track(item.trackId)?.relativePath, targetRelativePath: item.targetRelativePath, sourceSize: item.sourceSize, sourceMtimeMs: item.sourceMtimeMs, status: item.status, conflict: item.status === 'conflict', warning: item.status.startsWith('warning_') })) });
  });
  app.post('/api/plans/preview-jobs', async (request, reply) => {
    const body = request.body as Body; const source = grants.get(body.sourceRootId); const destination = grants.get(body.destinationRootId);
    if (!source || source.role !== 'source' || !destination || destination.role !== 'destination') return reply.code(400).send({ error: 'ROOTS_INVALID' });
    const mode = body.mode; if (!['simulation', 'safe'].includes(mode)) return reply.code(400).send({ error: 'PLAN_MODE_INVALID' });
    const trackIds = body.all === true ? (catalog.db.prepare('SELECT id FROM tracks WHERE root_id=? AND present=1 ORDER BY relative_path').all(source.id) as Array<{ id: string }>).map((row) => row.id) : Array.isArray(body.trackIds) ? [...new Set(body.trackIds.filter((id): id is string => typeof id === 'string'))] : [];
    if (!trackIds.length) return reply.code(400).send({ error: 'TRACKS_REQUIRED' });
    const jobId = randomUUID(); const job = { id: jobId, state: 'queued' as const, phase: 'Preparando revisión', processed: 0, total: trackIds.length, conflicts: 0, warnings: 0 };
    planBuildJobs.set(jobId, job);
    setImmediate(async () => {
      const current = planBuildJobs.get(jobId); if (!current) return; current.state = 'running'; current.phase = 'Leyendo canciones y calculando nombres finales';
      const id = randomUUID(); const now = new Date().toISOString(); const insertPlan = catalog.db.prepare("INSERT INTO organization_plans(id,source_root_id,destination_root_id,status,mode,manifest_json,created_at) VALUES (?,?,?,'preview',?,?,?)"); const insertItem = catalog.db.prepare('INSERT INTO plan_items(id,plan_id,track_id,source_path,target_relative_path,source_size,source_mtime_ms,source_hash,status) VALUES (?,?,?,?,?,?,?,?,?)'); const items: any[] = [];
      try {
        for (const trackId of trackIds) {
          if ((current as any).state === 'cancelled') return;
          const track = catalog.track(trackId); if (!track || track.rootId !== source.id) throw new Error('TRACK_OUTSIDE_SOURCE');
          current.current = track.relativePath; current.phase = 'Calculando destino y verificando conflictos';
          const targetRelativePath = trackTarget(track); current.phase = 'Calculando huella del archivo original'; const sourceHash = await sha256File(track.originalPath);
          const item = { id: randomUUID(), trackId, sourcePath: track.originalPath, targetRelativePath, sourceSize: track.bytes, sourceMtimeMs: track.mtimeMs, sourceHash, status: 'planned' };
          try { const existing = await lstat(path.join(destination.path, targetRelativePath)); if (existing.isFile() && existing.size === track.bytes && await sha256File(path.join(destination.path, targetRelativePath)) === sourceHash) item.status = 'warning_existing_verified'; else item.status = 'conflict'; } catch (error: any) { if (error.code !== 'ENOENT') throw error; }
          items.push(item); current.processed += 1; current.conflicts = items.filter((row) => row.status === 'conflict').length; current.warnings = items.filter((row) => String(row.status).startsWith('warning_')).length;
        }
        current.phase = 'Revisando nombres duplicados internos'; const targetCounts = new Map<string, number>(); for (const item of items) { const key = item.targetRelativePath.normalize('NFC').toLocaleLowerCase(); targetCounts.set(key, (targetCounts.get(key) ?? 0) + 1); } for (const item of items) if ((targetCounts.get(item.targetRelativePath.normalize('NFC').toLocaleLowerCase()) ?? 0) > 1) item.status = 'conflict';
        const conflicts = items.filter((item) => item.status === 'conflict').length; const warnings = items.filter((item) => item.status.startsWith('warning_')).length; const audit = foundAudit(catalog, source.id); const manifest = JSON.stringify({ mode, conflicts, warnings, audit, rulesVersion: 2, generatedAt: now });
        catalog.db.transaction(() => { insertPlan.run(id, source.id, destination.id, mode, manifest, now); for (const item of items) insertItem.run(item.id,id,item.trackId,item.sourcePath,item.targetRelativePath,item.sourceSize,item.sourceMtimeMs,item.sourceHash,item.status); })();
        current.state = 'completed'; current.phase = 'Revisión lista para aprobar'; current.conflicts = conflicts; current.warnings = warnings; current.plan = { id, status: 'preview', revision: 1, mode, conflicts, warnings, audit, items: items.map((item) => ({ id: item.id, trackId: item.trackId, sourcePath: catalog.track(item.trackId)?.relativePath, targetRelativePath: item.targetRelativePath, sourceSize: item.sourceSize, sourceMtimeMs: item.sourceMtimeMs, status: item.status, conflict: item.status === 'conflict', warning: item.status.startsWith('warning_') })) };
      } catch (error) { current.state = 'failed'; current.phase = 'La revisión falló'; current.error = safeErrorCode(error, 'PLAN_PREVIEW_FAILED'); }
    });
    return reply.code(202).send({ jobId });
  });
  app.get('/api/plans/preview-jobs/:id', async (request, reply) => { const job = planBuildJobs.get((request.params as Body).id); if (!job) return reply.code(404).send({ error: 'JOB_NOT_FOUND' }); return job; });
  app.post('/api/plans/preview-jobs/:id/cancel', async (request, reply) => { const job = planBuildJobs.get((request.params as Body).id); if (!job) return reply.code(404).send({ error: 'JOB_NOT_FOUND' }); if (job.state === 'running' || job.state === 'queued') job.state = 'cancelled'; return { id: job.id, state: job.state }; });

  app.post('/api/plans/:id/approve', async (request, reply) => {
    const id = (request.params as Body).id; const revision = Number((request.body as Body)?.revision);
    if (!Number.isInteger(revision)) return reply.code(400).send({ error: 'PLAN_REVISION_REQUIRED' });
    const conflicts = Number((catalog.db.prepare("SELECT count(*) count FROM plan_items WHERE plan_id=? AND status='conflict'").get(id) as any)?.count ?? 0);
    if (conflicts) return reply.code(409).send({ error: 'PLAN_HAS_CONFLICTS', conflicts });
    const result = catalog.db.prepare("UPDATE organization_plans SET status='approved',revision=revision+1,approved_at=? WHERE id=? AND status='preview' AND revision=?").run(new Date().toISOString(), id, revision);
    if (!result.changes) return reply.code(409).send({ error: 'PLAN_NOT_APPROVABLE' });
    const items = catalog.db.prepare('SELECT * FROM plan_items WHERE plan_id=? ORDER BY rowid').all(id) as any[];
    return { id, revision: revision + 1, status: 'approved', conflicts: 0, warnings: items.filter((row) => String(row.status).startsWith('warning_')).length, items: items.map((row) => ({ id: row.id, trackId: row.track_id, sourcePath: catalog.track(row.track_id)?.relativePath, targetRelativePath: row.target_relative_path, sourceSize: row.source_size, status: row.status, warning: String(row.status).startsWith('warning_') })) };
  });
  app.post('/api/plans/:id/apply', async (request, reply) => {
    const id = (request.params as Body).id; const plan: any = catalog.db.prepare('SELECT * FROM organization_plans WHERE id=?').get(id);
    if (!plan || plan.status !== 'approved') return reply.code(409).send({ error: 'PLAN_NOT_APPROVED' });
    const revision = Number((request.body as Body)?.revision); if (!Number.isInteger(revision) || revision !== plan.revision) return reply.code(409).send({ error: 'PLAN_REVISION_STALE' });
    if (plan.mode !== 'safe') return reply.code(409).send({ error: 'SIMULATION_CANNOT_WRITE' });
    const destination = grants.get(plan.destination_root_id); if (!destination) return reply.code(409).send({ error: 'DESTINATION_NOT_AUTHORIZED' });
    const items = catalog.db.prepare('SELECT * FROM plan_items WHERE plan_id=? ORDER BY rowid').all(id) as any[]; const operations: any[] = []; let copied = 0; let failed = 0;
    const filesystem = await statfs(destination.path); const requiredBytes = items.reduce((sum, item) => sum + Number(item.source_size), 0);
    if (!hasSufficientSpace(requiredBytes, filesystem.bavail, filesystem.bsize)) return reply.code(507).send({ error: 'INSUFFICIENT_DESTINATION_SPACE', requiredBytes });
    const claimed = catalog.db.prepare("UPDATE organization_plans SET status='applying',revision=revision+1 WHERE id=? AND status='approved' AND revision=?").run(id,revision);
    if (!claimed.changes) return reply.code(409).send({ error: 'PLAN_ALREADY_CLAIMED' });
    const runApply = async () => {
      for (const item of items) {
        const stop = catalog.db.prepare('SELECT status FROM organization_plans WHERE id=?').get(id) as any; if (stop?.status === 'cancel_requested') { catalog.db.prepare("UPDATE organization_plans SET status='cancelled' WHERE id=?").run(id); return; }
        const operationId = randomUUID(); let destinationPath: string; let sourcePath: string;
        try {
          const track = catalog.track(item.track_id); if (!track) throw new Error('TRACK_NOT_FOUND');
          sourcePath = await grants.resolve(plan.source_root_id, track.relativePath); destinationPath = await grants.resolve(plan.destination_root_id, item.target_relative_path);
          if (sourcePath !== item.source_path) throw new Error('SOURCE_CAPABILITY_MISMATCH');
          catalog.db.prepare("INSERT INTO operations(id,plan_id,plan_item_id,source_path,destination_path,state,created_at) VALUES (?,?,?,?,?,'intent_durable',?)").run(operationId,id,item.id,sourcePath,destinationPath,new Date().toISOString());
          const current = await stat(sourcePath); if (!sourceSnapshotMatches(current, { size: item.source_size, mtimeMs: item.source_mtime_ms }) || await sha256File(sourcePath) !== item.source_hash) throw Object.assign(new Error('SOURCE_CHANGED'), { code: 'SOURCE_CHANGED' });
          let verified: { sourceHash: string; targetHash: string; bytes: number };
          if (item.status === 'warning_existing_verified') verified = { sourceHash: item.source_hash, targetHash: item.source_hash, bytes: item.source_size };
          else verified = await copyVerifiedNoClobber(sourcePath, destinationPath);
          copied += 1; catalog.setFinalPath(item.track_id, destinationPath);
          catalog.db.prepare("UPDATE operations SET state='committed',source_hash=?,final_hash=?,bytes=?,finished_at=? WHERE id=?").run(verified.sourceHash,verified.targetHash,verified.bytes,new Date().toISOString(),operationId);
          catalog.db.prepare("UPDATE plan_items SET status='committed' WHERE id=?").run(item.id); operations.push({ id: operationId, destination: item.target_relative_path, state: 'committed' });
        } catch (error) { failed += 1; const operation = catalog.db.prepare('SELECT id FROM operations WHERE id=?').get(operationId); const code = safeErrorCode(error, 'OPERATION_FAILED'); if (operation) catalog.db.prepare("UPDATE operations SET state='failed',error=?,finished_at=? WHERE id=?").run(code,new Date().toISOString(),operationId); catalog.db.prepare("UPDATE plan_items SET status='failed' WHERE id=?").run(item.id); operations.push({ id: operationId, destination: item.target_relative_path, state: 'failed', error: code }); }
      }
      const cancelled = Number((catalog.db.prepare("SELECT count(*) count FROM operations WHERE plan_id=? AND error='PLAN_CANCELLED'").get(id) as any).count) > 0;
      catalog.db.prepare('UPDATE organization_plans SET status=? WHERE id=?').run(cancelled ? 'cancelled' : failed ? 'failed' : 'applied', id);
    };
    if (allowPathInput) { await runApply(); return { jobId: id, revision: revision + 1, copied, failed, operations }; }
    setImmediate(() => { void runApply(); });
    return reply.code(202).send({ jobId: id, revision: revision + 1, state: 'applying' });
  });
  app.post('/api/plans/:id/cancel', async (request, reply) => {
    const id = (request.params as Body).id;
    const result = catalog.db.prepare("UPDATE organization_plans SET status='cancel_requested' WHERE id=? AND status='applying'").run(id);
    if (!result.changes) return reply.code(409).send({ error: 'PLAN_NOT_APPLYING' });
    return { id, status: 'cancel_requested' };
  });
  app.post('/api/plans/:id/rollback', async (request, reply) => {
    const id = (request.params as Body).id; const plan = catalog.db.prepare('SELECT * FROM organization_plans WHERE id=?').get(id) as any;
    if (!plan || !['applied','failed','recovery_required'].includes(plan.status)) return reply.code(409).send({ error: 'PLAN_NOT_ROLLBACKABLE' });
    if (!grants.get(plan.destination_root_id)) return reply.code(409).send({ error: 'DESTINATION_NOT_AUTHORIZED' });
    const operations = catalog.db.prepare("SELECT o.*,p.target_relative_path FROM operations o JOIN plan_items p ON p.id=o.plan_item_id WHERE o.plan_id=? AND o.state='committed'").all(id) as any[];
    let removed = 0; let blocked = Number((catalog.db.prepare("SELECT count(*) count FROM operations WHERE plan_id=? AND state='intent_durable'").get(id) as any).count ?? 0);
    for (const operation of operations) {
      try {
        const resolved = await grants.resolve(plan.destination_root_id, operation.target_relative_path);
        if (resolved !== operation.destination_path) { blocked += 1; continue; }
        await removeVerifiedFile(resolved, operation.final_hash); catalog.db.prepare("UPDATE operations SET state='rolled_back',finished_at=? WHERE id=?").run(new Date().toISOString(),operation.id);
        catalog.db.prepare('UPDATE tracks SET final_path=NULL WHERE final_path=?').run(resolved); removed += 1;
      } catch { blocked += 1; }
    }
    if (!blocked) catalog.db.prepare("UPDATE organization_plans SET status='rolled_back' WHERE id=?").run(id);
    return { removed, blocked };
  });
  app.get('/api/plans/current', async () => {
    const plan = catalog.db.prepare('SELECT * FROM organization_plans ORDER BY created_at DESC LIMIT 1').get() as any; if (!plan) return null;
    const rows = catalog.db.prepare('SELECT * FROM plan_items WHERE plan_id=? ORDER BY rowid').all(plan.id) as any[];
    const manifest = JSON.parse(plan.manifest_json || '{}');
    return { id: plan.id, revision: plan.revision, status: plan.status, mode: plan.mode, conflicts: rows.filter((row) => row.status === 'conflict').length, warnings: rows.filter((row) => String(row.status).startsWith('warning_')).length, audit: manifest.audit, items: rows.map((row) => ({ id: row.id, trackId: row.track_id, sourcePath: catalog.track(row.track_id)?.relativePath, targetRelativePath: row.target_relative_path, sourceSize: row.source_size, status: row.status, conflict: row.status === 'conflict', warning: String(row.status).startsWith('warning_') })) };
  });

  const organizerVerified = () => Number((catalog.db.prepare("SELECT count(*) count FROM organization_plans WHERE status='applied'").get() as any).count) > 0;
  app.post('/api/playlists', async (request, reply) => {
    if (!organizerVerified()) return reply.code(423).send({ error: 'ORGANIZER_NOT_VERIFIED' });
    const body = request.body as Body; if (typeof body?.name !== 'string' || !body.name.trim() || typeof body.rule !== 'object' || body.rule === null || Array.isArray(body.rule)) return reply.code(400).send({ error: 'PLAYLIST_INVALID' });
    const id = randomUUID(); const rule = body.rule as Body;
    if (Object.keys(rule).length !== 1 || rule.favorite !== true) return reply.code(400).send({ error: 'PLAYLIST_RULE_UNSUPPORTED' });
    let tracks = catalog.tracks(100000, 0).filter((track) => track.finalPath);
    tracks = tracks.filter((track) => track.favorite);
    catalog.db.transaction(() => { catalog.db.prepare('INSERT INTO playlists VALUES (?,?,?,?)').run(id,body.name.trim(),JSON.stringify(rule),new Date().toISOString()); const insert = catalog.db.prepare('INSERT INTO playlist_tracks VALUES (?,?,?)'); tracks.forEach((track,index) => insert.run(id,track.id,index)); })();
    return reply.code(201).send({ id, name: body.name.trim(), count: tracks.length, rule });
  });
  app.get('/api/playlists', async (_request, reply) => {
    if (!organizerVerified()) return reply.code(423).send({ error: 'ORGANIZER_NOT_VERIFIED' });
    const rows = catalog.db.prepare('SELECT p.*,count(pt.track_id) tracks FROM playlists p LEFT JOIN playlist_tracks pt ON pt.playlist_id=p.id GROUP BY p.id ORDER BY p.created_at DESC').all() as any[];
    return { items: rows.map((row) => ({ id: row.id, name: row.name, rule: JSON.parse(row.rule_json).favorite ? 'favorites' : 'custom', tracks: row.tracks, updatedAt: row.created_at })) };
  });
  app.post('/api/playlists/:id/export', async (request, reply) => {
    if (!organizerVerified()) return reply.code(423).send({ error: 'ORGANIZER_NOT_VERIFIED' });
    const id = (request.params as Body).id; const body = request.body as Body; const destination = grants.get(body.destinationRootId); const playlist: any = catalog.db.prepare('SELECT * FROM playlists WHERE id=?').get(id);
    if (!playlist || !destination || destination.role !== 'destination' || !['m3u8','apple-xml'].includes(body.format)) return reply.code(400).send({ error: 'EXPORT_INVALID' });
    const rows = catalog.db.prepare('SELECT t.* FROM playlist_tracks p JOIN tracks t ON t.id=p.track_id WHERE p.playlist_id=? ORDER BY p.position').all(id) as any[];
    const tracks = rows.filter((row) => row.final_path).map((row) => ({ id: row.id, title: row.title ?? row.original_filename, artist: row.artist ?? 'Artista desconocido', duration: row.duration ?? 0, absolutePath: row.final_path }));
    const extension = body.format === 'm3u8' ? '.m3u8' : '.xml'; const relativeTarget = path.join('_Playlists', cleanSegment(playlist.name) + extension); const target = await grants.resolve(body.destinationRootId, relativeTarget); const dir = path.dirname(target);
    const content = body.format === 'm3u8' ? exportM3U8(playlist.name, tracks, dir) : exportAppleXml(playlist.name, tracks);
    await writeTextNoClobber(target, content);
    return reply.code(201).send({ path: relativeTarget, count: tracks.length, format: body.format });
  });
  app.get('/api/history', async () => {
    const rows = catalog.db.prepare("SELECT p.id,p.status,p.created_at,count(i.id) files,sum(CASE WHEN i.status='committed' THEN 1 ELSE 0 END) verified FROM organization_plans p LEFT JOIN plan_items i ON i.plan_id=p.id GROUP BY p.id ORDER BY p.created_at DESC LIMIT 500").all() as any[];
    return { items: rows.map((row) => ({ id: row.id, type: 'Organización segura', state: row.status, createdAt: row.created_at, files: row.files ?? 0, verified: row.verified ?? 0, rollbackAvailable: ['applied','failed','recovery_required'].includes(row.status) })) };
  });
  return app;
}
