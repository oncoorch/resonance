import { describe, expect, it } from 'vitest';
import { groupExactDuplicates, musicalCandidate } from '../../packages/core/src/duplicates.js';

describe('duplicados conservadores', () => {
  it('agrupa exactos solo por hash completo y tamaño', () => {
    const groups = groupExactDuplicates([{ id: 'a', hash: 'x', size: 10 }, { id: 'b', hash: 'x', size: 10 }, { id: 'c', hash: 'x', size: 11 }]);
    expect(groups).toEqual([['a', 'b']]);
  });
  it('trata versiones musicales como candidatos, nunca exactos', () => {
    expect(musicalCandidate({ title: 'Song', artist: 'A', duration: 200 }, { title: 'Song', artist: 'A', duration: 202 })).toMatchObject({ possible: true });
    expect(musicalCandidate({ title: 'Song (Live)', artist: 'A', duration: 200 }, { title: 'Song', artist: 'A', duration: 200 }).possible).toBe(false);
  });
});
