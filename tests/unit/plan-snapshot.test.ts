import { describe, expect, it } from 'vitest';
import { sourceSnapshotMatches } from '../../apps/server/src/services/filesystem.js';

describe('snapshot de simulación', () => {
  it('invalida el plan si tamaño o mtime cambian tras aprobar', () => {
    expect(sourceSnapshotMatches({ size: 10, mtimeMs: 20 }, { size: 10, mtimeMs: 20 })).toBe(true);
    expect(sourceSnapshotMatches({ size: 11, mtimeMs: 20 }, { size: 10, mtimeMs: 20 })).toBe(false);
    expect(sourceSnapshotMatches({ size: 10, mtimeMs: 21 }, { size: 10, mtimeMs: 20 })).toBe(false);
  });
});
