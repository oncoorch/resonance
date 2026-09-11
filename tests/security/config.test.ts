import { describe, expect, it } from 'vitest';
import { resolveServerConfig } from '../../apps/server/src/config.js';

describe('production test-only path input gate', () => {
  it('ignores ALLOW_PATH_INPUT_FOR_TESTS outside NODE_ENV=test', () => {
    const config = resolveServerConfig({ NODE_ENV: 'production', ALLOW_PATH_INPUT_FOR_TESTS: '1' });
    expect(config.allowPathInputForTests).toBe(false);
  });

  it('allows the explicit path gate in test mode', () => {
    const config = resolveServerConfig({ NODE_ENV: 'test', ALLOW_PATH_INPUT_FOR_TESTS: '1' });
    expect(config.allowPathInputForTests).toBe(true);
  });
});
