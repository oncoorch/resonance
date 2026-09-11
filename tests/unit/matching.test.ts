import { describe, expect, it } from 'vitest';
import { scoreCandidate } from '../../packages/core/src/matching.js';

describe('confianza explicable', () => {
  it('no normaliza evidencia incompleta hasta 100', () => {
    expect(scoreCandidate({ title: 1, artist: 1 }).score).toBe(50);
  });
  it('bloquea contradicciones fuertes y empates cercanos', () => {
    expect(scoreCandidate({ title: 1, artist: 1, album: 1, duration: 1, track: 1, year: 1, group: 1 }, { contradiction: true }).autoAccept).toBe(false);
    expect(scoreCandidate({ title: 1, artist: 1, album: 1, duration: 1, track: 1 }, { runnerUp: 88 }).autoAccept).toBe(false);
  });
  it('acepta automáticamente solo evidencia alta y no ambigua', () => {
    expect(scoreCandidate({ title: 1, artist: 1, album: 1, duration: 1, track: 1, year: 1, group: 1 }).autoAccept).toBe(true);
  });
});
