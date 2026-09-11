import { describe, expect, it } from 'vitest';
import { hasSufficientSpace } from '../../apps/server/src/services/filesystem.js';

describe('espacio de destino', () => {
  it('reserva cinco por ciento y 64 MiB antes de aplicar', () => {
    expect(hasSufficientSpace(100_000_000, 1_000_000_000, 1)).toBe(true);
    expect(hasSufficientSpace(950_000_000, 1_000_000_000, 1)).toBe(false);
  });
});
