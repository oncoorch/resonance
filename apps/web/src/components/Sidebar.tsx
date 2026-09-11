import type { Language, ViewId } from '../types';
import { Icon } from './Icon';

const labels = {
  es: { music: 'Tu música', library: 'Biblioteca', tracks: 'Canciones', artists: 'Artistas', albums: 'Álbumes', genres: 'Géneros', review: 'Revisión', duplicates: 'Duplicados', unidentified: 'Sin identificar', collections: 'Colecciones', playlists: 'Playlists', history: 'Historial', settings: 'Configuración', locked: ' · bloqueadas', local: 'Solo en este dispositivo' },
  en: { music: 'Your music', library: 'Library', tracks: 'Songs', artists: 'Artists', albums: 'Albums', genres: 'Genres', review: 'Review', duplicates: 'Duplicates', unidentified: 'Unidentified', collections: 'Collections', playlists: 'Playlists', history: 'History', settings: 'Settings', locked: ' · locked', local: 'Only on this device' },
};

export function Sidebar({ active, onNavigate, open, onClose, badges, playlistsUnlocked, language }: { active: ViewId; onNavigate: (id: ViewId) => void; open: boolean; onClose: () => void; badges: { duplicates: number; unidentified: number }; playlistsUnlocked: boolean; language: Language }) {
  const t = labels[language];
  const groups: Array<{ label: string; items: Array<{ id: ViewId; label: string; badge?: keyof typeof badges }> }> = [
    { label: t.music, items: [{ id: 'library', label: t.library }, { id: 'tracks', label: t.tracks }, { id: 'artists', label: t.artists }, { id: 'albums', label: t.albums }, { id: 'genres', label: t.genres }] },
    { label: t.review, items: [{ id: 'duplicates', label: t.duplicates, badge: 'duplicates' }, { id: 'unidentified', label: t.unidentified, badge: 'unidentified' }] },
    { label: t.collections, items: [{ id: 'playlists', label: t.playlists }, { id: 'history', label: t.history }] },
  ];
  const navigate = (id: ViewId) => { onNavigate(id); onClose(); };
  return <><aside className={`sidebar ${open ? 'sidebar-open' : ''}`} aria-label="Main navigation">
    <div className="brand"><div className="brand-mark" aria-hidden="true"><i/><i/><i/><i/></div><div><strong>RESONANCE</strong><span>Local library</span></div></div>
    <nav>
      {groups.map((group) => <div className="nav-group" key={group.label}><p>{group.label}</p>{group.items.map((item) => { const locked = item.id === 'playlists' && !playlistsUnlocked; return <button key={item.id} disabled={locked} title={locked ? 'Disponible después de una organización verificada' : undefined} className={active === item.id ? 'active' : ''} aria-current={active === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}><Icon name={item.id}/><span>{item.label}{locked ? t.locked : ''}</span>{item.badge && badges[item.badge] > 0 && <b>{badges[item.badge]}</b>}</button>; })}</div>)}
    </nav>
    <div className="sidebar-footer"><button className={active === 'settings' ? 'active' : ''} onClick={() => navigate('settings')}><Icon name="settings"/><span>{t.settings}</span></button><div className="privacy"><span className="status-dot"/>{t.local}</div></div>
  </aside>{open && <button className="sidebar-scrim" aria-label="Close menu" onClick={onClose}/>}</>;
}
