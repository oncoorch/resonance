import path from 'node:path';
import { pathToFileURL } from 'node:url';

export interface PlaylistTrack { id: string; title: string; artist: string; duration: number; absolutePath: string }
const xml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
export function exportM3U8(_name: string, tracks: PlaylistTrack[], playlistDirectory: string): string {
  const lines = ['#EXTM3U'];
  for (const track of tracks) { lines.push(`#EXTINF:${Math.round(track.duration)},${track.artist.replace(/[\r\n]/g, ' ')} - ${track.title.replace(/[\r\n]/g, ' ')}`); lines.push(path.relative(playlistDirectory, track.absolutePath).split(path.sep).join('/')); }
  return `${lines.join('\n')}\n`;
}
export function exportAppleXml(name: string, tracks: PlaylistTrack[]): string {
  const entries = tracks.map((track, index) => `<key>${index + 1}</key><dict><key>Track ID</key><integer>${index + 1}</integer><key>Name</key><string>${xml(track.title)}</string><key>Artist</key><string>${xml(track.artist)}</string><key>Total Time</key><integer>${Math.round(track.duration * 1000)}</integer><key>Location</key><string>${xml(pathToFileURL(track.absolutePath).href)}</string></dict>`).join('');
  const refs = tracks.map((_track, index) => `<dict><key>Track ID</key><integer>${index + 1}</integer></dict>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>Major Version</key><integer>1</integer><key>Tracks</key><dict>${entries}</dict><key>Playlists</key><array><dict><key>Name</key><string>${xml(name)}</string><key>Playlist Items</key><array>${refs}</array></dict></array></dict></plist>`;
}
