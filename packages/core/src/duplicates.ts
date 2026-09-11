import { normalizeName } from './normalization.js';
export interface ExactFile { id: string; hash: string; size: number }
export function groupExactDuplicates(files: ExactFile[]): string[][] {
  const groups = new Map<string, string[]>();
  for (const file of files) { const key = `${file.size}:${file.hash}`; groups.set(key, [...(groups.get(key) ?? []), file.id]); }
  return [...groups.values()].filter((group) => group.length > 1);
}
interface MusicalTrack { title: string; artist: string; duration: number }
const qualifier = /(live|remix|acoustic|remaster|radio edit|extended|mono|stereo)/iu;
export function musicalCandidate(a: MusicalTrack, b: MusicalTrack): { possible: boolean; reason: string } {
  const titleA = normalizeName(a.title).key; const titleB = normalizeName(b.title).key;
  if (qualifier.test(titleA) !== qualifier.test(titleB)) return { possible: false, reason: 'versiones distintas' };
  const possible = titleA === titleB && normalizeName(a.artist).key === normalizeName(b.artist).key && Math.abs(a.duration - b.duration) <= 3;
  return { possible, reason: possible ? 'título, artista y duración próximos' : 'evidencia insuficiente' };
}
