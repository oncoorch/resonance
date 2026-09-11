const NOISE = /\s*(?:\[(?:320\s*kbps|official\s+audio|official\s+video)\]|\((?:official\s+audio|official\s+video)\))\s*/giu;

export interface NormalizedName { raw: string; canonical: string; key: string }

export function normalizeName(raw: string): NormalizedName {
  const canonical = raw.normalize('NFC').replace(NOISE, ' ').replace(/\s+/g, ' ').trim();
  const key = canonical.toLocaleLowerCase('und').replace(/[‐‑‒–—―]/g, '-').replace(/[‘’´`]/g, "'").replace(/\s*-\s*/g, ' - ').replace(/\s+/g, ' ').trim();
  return { raw, canonical, key };
}

const GENRES = new Map([['hiphop', 'Hip-Hop'], ['hip hop', 'Hip-Hop'], ['hip-hop', 'Hip-Hop'], ['r&b', 'R&B'], ['rhythm and blues', 'R&B']]);
export function normalizeGenre(raw: string): string {
  const clean = raw.normalize('NFC').trim().replace(/\s+/g, ' ');
  return GENRES.get(clean.toLocaleLowerCase('und')) ?? clean;
}
