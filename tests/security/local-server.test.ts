import { describe, expect, it } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildApp } from '../../apps/server/src/app.js';

describe('path-input authorization gate', () => {
  it('does not expose arbitrary path authorization in production', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'mlo-gate-'));
    const app = await buildApp({ dbPath: path.join(dir, 'db.sqlite'), allowedOrigins: ['http://127.0.0.1:5173'], nodeEnv: 'production', allowPathInputForTests: false });
    const base = { host: '127.0.0.1:4888', origin: 'http://127.0.0.1:5173' };
    const paired = await app.inject({ method: 'POST', url: '/api/session/bootstrap', headers: base, payload: {} });
    const headers = { ...base, cookie: `${paired.cookies[0].name}=${paired.cookies[0].value}`, 'x-csrf-token': paired.json().csrfToken };
    const response = await app.inject({ method: 'POST', url: '/api/roots/authorize', headers, payload: { path: dir, role: 'source' } });
    expect(response.statusCode).toBe(404);
    await app.close();
  });
});
