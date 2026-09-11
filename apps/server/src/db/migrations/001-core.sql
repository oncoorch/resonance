CREATE TABLE IF NOT EXISTS roots (
  id TEXT PRIMARY KEY, role TEXT NOT NULL CHECK(role IN ('source','destination')),
  native_path TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY, type TEXT NOT NULL, root_id TEXT REFERENCES roots(id),
  status TEXT NOT NULL, discovered INTEGER NOT NULL DEFAULT 0,
  processed INTEGER NOT NULL DEFAULT 0, errors INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL, finished_at TEXT
);
CREATE TABLE IF NOT EXISTS tracks (
  id TEXT PRIMARY KEY, root_id TEXT NOT NULL REFERENCES roots(id), relative_path TEXT NOT NULL,
  original_path TEXT NOT NULL, final_path TEXT, original_filename TEXT NOT NULL,
  title TEXT, artist TEXT, album TEXT, album_artist TEXT, year INTEGER,
  track_no INTEGER, disc_no INTEGER, genre TEXT, duration REAL, format TEXT,
  codec TEXT, bytes INTEGER NOT NULL, mtime_ms REAL NOT NULL, sha256 TEXT,
  metadata_source TEXT NOT NULL, favorite INTEGER NOT NULL DEFAULT 0,
  present INTEGER NOT NULL DEFAULT 1, scan_date TEXT NOT NULL, UNIQUE(root_id, relative_path)
);
CREATE TABLE IF NOT EXISTS errors (
  id INTEGER PRIMARY KEY AUTOINCREMENT, job_id TEXT REFERENCES jobs(id), path TEXT NOT NULL,
  phase TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS organization_plans (
  id TEXT PRIMARY KEY, source_root_id TEXT NOT NULL REFERENCES roots(id),
  destination_root_id TEXT NOT NULL REFERENCES roots(id), status TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1, mode TEXT NOT NULL DEFAULT 'simulation',
  manifest_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL, approved_at TEXT
);
CREATE TABLE IF NOT EXISTS plan_items (
  id TEXT PRIMARY KEY, plan_id TEXT NOT NULL REFERENCES organization_plans(id),
  track_id TEXT NOT NULL REFERENCES tracks(id), source_path TEXT NOT NULL,
  target_relative_path TEXT NOT NULL, source_size INTEGER NOT NULL,
  source_mtime_ms REAL NOT NULL, source_hash TEXT, status TEXT NOT NULL DEFAULT 'planned'
);
CREATE TABLE IF NOT EXISTS operations (
  id TEXT PRIMARY KEY, plan_id TEXT NOT NULL REFERENCES organization_plans(id),
  plan_item_id TEXT NOT NULL REFERENCES plan_items(id), source_path TEXT NOT NULL,
  destination_path TEXT NOT NULL, source_hash TEXT, final_hash TEXT,
  bytes INTEGER, state TEXT NOT NULL, error TEXT, created_at TEXT NOT NULL, finished_at TEXT
);
CREATE TABLE IF NOT EXISTS playlists (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, rule_json TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS playlist_tracks (
  playlist_id TEXT NOT NULL REFERENCES playlists(id), track_id TEXT NOT NULL REFERENCES tracks(id),
  position INTEGER NOT NULL, PRIMARY KEY(playlist_id, track_id)
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value_json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS search_cache (
  provider TEXT NOT NULL, cache_key TEXT NOT NULL, response_json TEXT NOT NULL,
  expires_at INTEGER NOT NULL, PRIMARY KEY(provider, cache_key)
);
CREATE INDEX IF NOT EXISTS tracks_root_path ON tracks(root_id, relative_path);
CREATE INDEX IF NOT EXISTS tracks_artist_title ON tracks(artist, title);
CREATE INDEX IF NOT EXISTS operations_plan ON operations(plan_id, state);
