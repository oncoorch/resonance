import { describe, expect, it } from 'vitest';
import { buildTargetRelativePath, normalizeSongTitle } from '../../apps/server/src/services/organization-naming.js';

describe('nombres finales de organización', () => {
  it('quita numeración inicial aunque el track tenga número o el título venga desde el archivo', () => {
    expect(normalizeSongTitle('001. Queen – Another One Bites The Dust (2011 Remaster)')).toBe('Queen – Another One Bites The Dust (2011 Remaster)');
    expect(buildTargetRelativePath({ artist: 'Queen', album: '80s Rock Essentials', title: '01 - Another One Bites The Dust (2011 Remaster)', originalFilename: '001. Queen - Another One.mp3', trackNo: 1 })).toBe('Queen/80s Rock Essentials/Another One Bites The Dust (2011 Remaster).mp3');
  });
});
