import { describe, expect, it } from 'vitest';
import { normalizeName, normalizeGenre } from '../../packages/core/src/normalization.js';

describe('normalización conservadora', () => {
  it('preserva calificadores musicales y Unicode', () => {
    expect(normalizeName('  Björk — Jóga (Live) [320kbps]  ')).toEqual({ raw: '  Björk — Jóga (Live) [320kbps]  ', canonical: 'Björk — Jóga (Live)', key: 'björk - jóga (live)' });
  });
  it('normaliza solo alias de género conocidos', () => {
    expect(normalizeGenre(' hiphop ')).toBe('Hip-Hop');
    expect(normalizeGenre('Dream Pop')).toBe('Dream Pop');
  });
});
