import { describe, expect, it } from 'vitest';
import { groupExactDuplicates } from '../../packages/core/src/duplicates.js';
import { buildLibraryPath } from '../../packages/core/src/library-path.js';

describe('catálogo grande', () => {
  it('procesa 50.000 entradas sin comparación cuadrática', () => {
    const before = process.memoryUsage().heapUsed;
    const files = Array.from({ length: 50_000 }, (_, index) => ({ id: String(index), hash: index < 2 ? 'same' : `h${index}`, size: index < 2 ? 10 : index }));
    const paths = files.map((_file, index) => buildLibraryPath({ artist: `Artist ${index % 500}`, album: `Album ${index % 2000}`, title: `Track ${index}`, track: (index % 20) + 1, extension: '.flac' }));
    expect(paths).toHaveLength(50_000);
    expect(groupExactDuplicates(files)).toEqual([['0', '1']]);
    const heapGrowth = process.memoryUsage().heapUsed - before;
    expect(heapGrowth).toBeLessThan(256 * 1024 * 1024);
  });
});
