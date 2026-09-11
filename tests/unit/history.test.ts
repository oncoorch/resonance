import { describe, expect, it } from 'vitest';
import { canRollback } from '../../apps/web/src/features/history/History.js';

describe('historial recuperable', () => {
  it('solo ofrece rollback cuando el backend lo autoriza', () => {
    expect(canRollback({ rollbackAvailable: true })).toBe(true);
    expect(canRollback({ rollbackAvailable: false })).toBe(false);
  });
});
