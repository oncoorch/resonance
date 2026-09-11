import { describe, expect, it } from 'vitest';
import { resolveServerConfig } from '../../apps/server/src/config.js';

describe('server configuration', () => {
  it('binds loopback and never exposes an OpenAI key', () => {
    const config = resolveServerConfig({ PORT: '4999', OPENAI_API_KEY: 'secret', NODE_ENV: 'test' });
    expect(config.host).toBe('127.0.0.1');
    expect(config.port).toBe(4999);
    expect(JSON.stringify(config)).not.toContain('secret');
    expect(config.dbPath).toContain('MusicLibraryOrganizer');
  });
});
