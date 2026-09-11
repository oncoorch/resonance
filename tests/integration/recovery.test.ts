import { describe, expect, it } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Catalog } from '../../apps/server/src/db/catalog.js';

describe('recuperación conservadora', () => {
  it('bloquea como recovery_required cualquier plan que quedó applying tras un reinicio', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'resonancia-recovery-')); const dbPath = path.join(dir, 'catalog.db');
    const first = new Catalog(dbPath); const now = new Date().toISOString();
    first.db.prepare("INSERT INTO roots VALUES ('src','source','/tmp/src',?),('dst','destination','/tmp/dst',?)").run(now, now);
    first.db.prepare("INSERT INTO organization_plans(id,source_root_id,destination_root_id,status,mode,manifest_json,created_at) VALUES ('plan','src','dst','applying','safe','{}',?)").run(now);
    first.close();
    const reopened = new Catalog(dbPath);
    expect((reopened.db.prepare("SELECT status FROM organization_plans WHERE id='plan'").get() as any).status).toBe('recovery_required');
    reopened.close();
  });
});
