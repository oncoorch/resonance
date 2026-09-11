import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS roots (id TEXT PRIMARY KEY, role TEXT NOT NULL CHECK(role IN ('source','destination')), native_path TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, type TEXT NOT NULL, root_id TEXT REFERENCES roots(id), status TEXT NOT NULL, discovered INTEGER NOT NULL DEFAULT 0, processed INTEGER NOT NULL DEFAULT 0, errors INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, finished_at TEXT);
CREATE TABLE IF NOT EXISTS tracks (id TEXT PRIMARY KEY, root_id TEXT NOT NULL REFERENCES roots(id), relative_path TEXT NOT NULL, original_path TEXT NOT NULL, final_path TEXT, original_filename TEXT NOT NULL, title TEXT, artist TEXT, album TEXT, album_artist TEXT, year INTEGER, track_no INTEGER, disc_no INTEGER, genre TEXT, duration REAL, format TEXT, codec TEXT, bytes INTEGER NOT NULL, mtime_ms REAL NOT NULL, sha256 TEXT, metadata_source TEXT NOT NULL, favorite INTEGER NOT NULL DEFAULT 0, present INTEGER NOT NULL DEFAULT 1, scan_date TEXT NOT NULL, UNIQUE(root_id, relative_path));
CREATE TABLE IF NOT EXISTS errors (id INTEGER PRIMARY KEY AUTOINCREMENT, job_id TEXT REFERENCES jobs(id), path TEXT NOT NULL, phase TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS organization_plans (id TEXT PRIMARY KEY, source_root_id TEXT NOT NULL REFERENCES roots(id), destination_root_id TEXT NOT NULL REFERENCES roots(id), status TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1, mode TEXT NOT NULL DEFAULT 'simulation', manifest_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL, approved_at TEXT);
CREATE TABLE IF NOT EXISTS plan_items (id TEXT PRIMARY KEY, plan_id TEXT NOT NULL REFERENCES organization_plans(id), track_id TEXT NOT NULL REFERENCES tracks(id), source_path TEXT NOT NULL, target_relative_path TEXT NOT NULL, source_size INTEGER NOT NULL, source_mtime_ms REAL NOT NULL, source_hash TEXT, status TEXT NOT NULL DEFAULT 'planned');
CREATE TABLE IF NOT EXISTS operations (id TEXT PRIMARY KEY, plan_id TEXT NOT NULL REFERENCES organization_plans(id), plan_item_id TEXT NOT NULL REFERENCES plan_items(id), source_path TEXT NOT NULL, destination_path TEXT NOT NULL, source_hash TEXT, final_hash TEXT, bytes INTEGER, state TEXT NOT NULL, error TEXT, created_at TEXT NOT NULL, finished_at TEXT);
CREATE TABLE IF NOT EXISTS playlists (id TEXT PRIMARY KEY, name TEXT NOT NULL, rule_json TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS playlist_tracks (playlist_id TEXT NOT NULL REFERENCES playlists(id), track_id TEXT NOT NULL REFERENCES tracks(id), position INTEGER NOT NULL, PRIMARY KEY(playlist_id, track_id));
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value_json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS search_cache (provider TEXT NOT NULL, cache_key TEXT NOT NULL, response_json TEXT NOT NULL, expires_at INTEGER NOT NULL, PRIMARY KEY(provider, cache_key));
CREATE INDEX IF NOT EXISTS tracks_root_path ON tracks(root_id, relative_path); CREATE INDEX IF NOT EXISTS tracks_artist_title ON tracks(artist,title); CREATE INDEX IF NOT EXISTS operations_plan ON operations(plan_id,state);`;

export interface TrackInput {
  id?: string; rootId: string; relativePath: string; originalPath: string; originalFilename: string;
  title?: string | null; artist?: string | null; album?: string | null; albumArtist?: string | null;
  year?: number | null; trackNo?: number | null; discNo?: number | null; genre?: string | null;
  duration?: number | null; format?: string | null; codec?: string | null; bytes: number; mtimeMs: number;
  metadataSource: string;
}

const camelTrack = (row: any) => row && ({ id: row.id, rootId: row.root_id, relativePath: row.relative_path, originalPath: row.original_path, finalPath: row.final_path, originalFilename: row.original_filename, title: row.title, artist: row.artist, album: row.album, albumArtist: row.album_artist, year: row.year, trackNo: row.track_no, discNo: row.disc_no, genre: row.genre, duration: row.duration, format: row.format, codec: row.codec, bytes: row.bytes, mtimeMs: row.mtime_ms, metadataSource: row.metadata_source, favorite: Boolean(row.favorite), scanDate: row.scan_date });

export class Catalog {
  readonly db: Database.Database;
  constructor(filePath: string) {
    this.db = new Database(filePath);
    this.db.pragma('foreign_keys = ON'); this.db.pragma('journal_mode = WAL'); this.db.pragma('synchronous = FULL');
    this.db.exec(SCHEMA);
    const planColumns = new Set((this.db.pragma('table_info(organization_plans)') as any[]).map((row) => row.name));
    if (!planColumns.has('mode')) this.db.exec("ALTER TABLE organization_plans ADD COLUMN mode TEXT NOT NULL DEFAULT 'simulation'");
    if (!planColumns.has('manifest_json')) this.db.exec("ALTER TABLE organization_plans ADD COLUMN manifest_json TEXT NOT NULL DEFAULT '{}'");
    const itemColumns = new Set((this.db.pragma('table_info(plan_items)') as any[]).map((row) => row.name));
    if (!itemColumns.has('source_hash')) this.db.exec('ALTER TABLE plan_items ADD COLUMN source_hash TEXT');
    const trackColumns = new Set((this.db.pragma('table_info(tracks)') as any[]).map((row) => row.name));
    if (!trackColumns.has('present')) this.db.exec('ALTER TABLE tracks ADD COLUMN present INTEGER NOT NULL DEFAULT 1');
    this.db.prepare("UPDATE organization_plans SET status='recovery_required' WHERE status='applying'").run();
    this.setDefault('mode', 'simulation'); this.setDefault('internetEnabled', false); this.setDefault('openaiEnabled', false);
  }
  close(): void { this.db.close(); }
  addRoot(root: { id: string; path: string; role: string; createdAt: string }): void { this.db.prepare('INSERT OR REPLACE INTO roots VALUES (?,?,?,?)').run(root.id, root.role, root.path, root.createdAt); }
  root(id: string): { id: string; role: string; path: string } | undefined { const row: any = this.db.prepare('SELECT * FROM roots WHERE id=?').get(id); return row && { id: row.id, role: row.role, path: row.native_path }; }
  createJob(rootId: string): string { const id = randomUUID(); this.db.prepare("INSERT INTO jobs(id,type,root_id,status,created_at) VALUES (?,'scan',?,'running',?)").run(id, rootId, new Date().toISOString()); return id; }
  finishJob(id: string, discovered: number, processed: number, errors: number): void { this.db.prepare("UPDATE jobs SET status='completed',discovered=?,processed=?,errors=?,finished_at=? WHERE id=?").run(discovered, processed, errors, new Date().toISOString(), id); }
  addError(jobId: string, filePath: string, message: string): void { this.db.prepare("INSERT INTO errors(job_id,path,phase,message,created_at) VALUES (?,?,'metadata',?,?)").run(jobId, filePath, message, new Date().toISOString()); }
  upsertTrack(input: TrackInput): string {
    const id = input.id ?? randomUUID();
    this.db.prepare(`INSERT INTO tracks(id,root_id,relative_path,original_path,original_filename,title,artist,album,album_artist,year,track_no,disc_no,genre,duration,format,codec,bytes,mtime_ms,metadata_source,scan_date)
      VALUES (@id,@rootId,@relativePath,@originalPath,@originalFilename,@title,@artist,@album,@albumArtist,@year,@trackNo,@discNo,@genre,@duration,@format,@codec,@bytes,@mtimeMs,@metadataSource,@scanDate)
      ON CONFLICT(root_id,relative_path) DO UPDATE SET original_path=excluded.original_path,title=excluded.title,artist=excluded.artist,album=excluded.album,album_artist=excluded.album_artist,year=excluded.year,track_no=excluded.track_no,disc_no=excluded.disc_no,genre=excluded.genre,duration=excluded.duration,format=excluded.format,codec=excluded.codec,bytes=excluded.bytes,mtime_ms=excluded.mtime_ms,metadata_source=excluded.metadata_source,present=1,scan_date=excluded.scan_date`).run({ ...input, id, title: input.title ?? null, artist: input.artist ?? null, album: input.album ?? null, albumArtist: input.albumArtist ?? null, year: input.year ?? null, trackNo: input.trackNo ?? null, discNo: input.discNo ?? null, genre: input.genre ?? null, duration: input.duration ?? null, format: input.format ?? null, codec: input.codec ?? null, scanDate: new Date().toISOString() });
    const row: any = this.db.prepare('SELECT id FROM tracks WHERE root_id=? AND relative_path=?').get(input.rootId, input.relativePath); return row.id;
  }
  tracks(limit = 100, offset = 0): any[] { return (this.db.prepare('SELECT * FROM tracks WHERE present=1 ORDER BY relative_path LIMIT ? OFFSET ?').all(limit, offset) as any[]).map(camelTrack); }
  queryTracks(query: { q?: string; filter?: string; sort?: string; limit: number; offset: number }): { items: any[]; total: number } {
    const clauses: string[] = ['present=1']; const params: unknown[] = [];
    if (query.q?.trim()) { clauses.push("(title LIKE ? ESCAPE '\\' OR artist LIKE ? ESCAPE '\\' OR album LIKE ? ESCAPE '\\' OR original_filename LIKE ? ESCAPE '\\')"); const value = `%${query.q.trim().replace(/[\\%_]/g, '\\$&')}%`; params.push(value,value,value,value); }
    if (query.filter === 'duplicates') clauses.push('sha256 IN (SELECT sha256 FROM tracks WHERE present=1 AND sha256 IS NOT NULL GROUP BY sha256 HAVING count(*)>1)');
    else if (query.filter === 'review') clauses.push('(title IS NULL OR artist IS NULL)');
    else if (query.filter === 'favorites') clauses.push('favorite=1');
    const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
    const order = query.sort === 'artist' ? 'artist COLLATE NOCASE, title COLLATE NOCASE' : query.sort === 'album' ? 'album COLLATE NOCASE, track_no' : query.sort === 'year' ? 'year DESC, title COLLATE NOCASE' : 'title COLLATE NOCASE, relative_path';
    const total = Number((this.db.prepare(`SELECT count(*) count FROM tracks${where}`).get(...params) as any).count);
    const items = (this.db.prepare(`SELECT * FROM tracks${where} ORDER BY ${order} LIMIT ? OFFSET ?`).all(...params,query.limit,query.offset) as any[]).map(camelTrack);
    return { items, total };
  }
  track(id: string): any { return camelTrack(this.db.prepare('SELECT * FROM tracks WHERE id=? AND present=1').get(id)); }
  setFavorite(id: string, value: boolean): boolean { return this.db.prepare('UPDATE tracks SET favorite=? WHERE id=?').run(value ? 1 : 0, id).changes === 1; }
  setFinalPath(id: string, finalPath: string): void { this.db.prepare('UPDATE tracks SET final_path=? WHERE id=?').run(finalPath, id); }
  stats(): Record<string, number> { const t: any = this.db.prepare('SELECT count(*) tracks,sum(favorite) favorites,count(DISTINCT artist) artists,count(DISTINCT album) albums,coalesce(sum(bytes),0) bytes FROM tracks WHERE present=1').get(); const e: any = this.db.prepare('SELECT count(*) errors FROM errors').get(); return { tracks: t.tracks, favorites: t.favorites ?? 0, artists: t.artists, albums: t.albums, bytes: t.bytes, errors: e.errors }; }
  private setDefault(key: string, value: unknown): void { this.db.prepare('INSERT OR IGNORE INTO settings VALUES (?,?)').run(key, JSON.stringify(value)); }
  settings(): Record<string, unknown> { return Object.fromEntries((this.db.prepare('SELECT * FROM settings').all() as any[]).map((r) => [r.key, JSON.parse(r.value_json)])); }
  updateSettings(values: Record<string, unknown>): Record<string, unknown> { const put = this.db.prepare('INSERT OR REPLACE INTO settings VALUES (?,?)'); this.db.transaction(() => Object.entries(values).forEach(([k,v]) => put.run(k, JSON.stringify(v))))(); return this.settings(); }
  cacheGet(provider: string, key: string): unknown | undefined { const r: any = this.db.prepare('SELECT response_json FROM search_cache WHERE provider=? AND cache_key=? AND expires_at>?').get(provider,key,Date.now()); return r ? JSON.parse(r.response_json) : undefined; }
  cachePut(provider: string, key: string, value: unknown, ttlMs: number): void { this.db.prepare('INSERT OR REPLACE INTO search_cache VALUES (?,?,?,?)').run(provider,key,JSON.stringify(value),Date.now()+ttlMs); }
}
