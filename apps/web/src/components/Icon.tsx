import type { ReactNode } from 'react';

const paths: Record<string, ReactNode> = {
  library: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5z"/><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20"/></>,
  tracks: <><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></>,
  artists: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  albums: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/><path d="M12 3v7"/></>,
  genres: <><path d="M4 6h16M4 12h10M4 18h7"/><circle cx="18" cy="12" r="2"/><circle cx="15" cy="18" r="2"/></>,
  duplicates: <><rect x="7" y="7" width="13" height="13" rx="2"/><path d="M4 17V6a2 2 0 0 1 2-2h11"/></>,
  unidentified: <><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.4 2.4 0 1 1 3.5 2.1c-.9.5-1.3 1-1.3 2M12 17h.01"/></>,
  playlists: <><path d="M4 6h12M4 11h12M4 16h8"/><path d="M18 13v7M18 13l3-1v6"/><circle cx="15.5" cy="20" r="2.5"/></>,
  history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1z"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  arrow: <path d="m9 18 6-6-6-6"/>, close: <path d="M6 6l12 12M18 6 6 18"/>,
  check: <path d="m5 12 4 4L19 6"/>, warning: <><path d="M12 3 2.8 20h18.4z"/><path d="M12 9v4M12 17h.01"/></>,
  folder: <path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>,
  play: <path d="m8 5 11 7-11 7z"/>, pause: <path d="M8 5v14M16 5v14"/>, stop: <path d="M6 6h12v12H6z"/>,
  heart: <path d="M20.8 5.8a5.5 5.5 0 0 0-7.8 0L12 6.9l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 22l7.8-7.3 1.1-1.1a5.5 5.5 0 0 0-.1-7.8z"/>,
  download: <><path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M4 19h16"/></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
};

export function Icon({ name, size = 18, filled = false }: { name: string; size?: number; filled?: boolean }) {
  return <svg aria-hidden="true" className="icon" width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name] ?? paths.library}</svg>;
}
