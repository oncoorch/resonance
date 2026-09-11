import type { ViewId } from '../types';
import { Icon } from './Icon';

const groups: Array<{ label: string; items: Array<{ id: ViewId; label: string; badge?: keyof Record<'duplicates' | 'unidentified', number> }> }> = [
  { label: 'Tu música', items: [
    { id: 'library', label: 'Biblioteca' }, { id: 'tracks', label: 'Canciones' }, { id: 'artists', label: 'Artistas' },
    { id: 'albums', label: 'Álbumes' }, { id: 'genres', label: 'Géneros' },
  ] },
  { label: 'Revisión', items: [
    { id: 'duplicates', label: 'Duplicados', badge: 'duplicates' }, { id: 'unidentified', label: 'Sin identificar', badge: 'unidentified' },
  ] },
  { label: 'Colecciones', items: [{ id: 'playlists', label: 'Playlists' }, { id: 'history', label: 'Historial' }] },
];

export function Sidebar({ active, onNavigate, open, onClose, badges, playlistsUnlocked }: { active: ViewId; onNavigate: (id: ViewId) => void; open: boolean; onClose: () => void; badges: { duplicates: number; unidentified: number }; playlistsUnlocked: boolean }) {
  const navigate = (id: ViewId) => { onNavigate(id); onClose(); };
  return <><aside className={`sidebar ${open ? 'sidebar-open' : ''}`} aria-label="Navegación principal">
    <div className="brand"><div className="brand-mark" aria-hidden="true"><i/><i/><i/><i/></div><div><strong>Resonancia</strong><span>Biblioteca local</span></div></div>
    <nav>
      {groups.map((group) => <div className="nav-group" key={group.label}><p>{group.label}</p>{group.items.map((item) => { const locked = item.id === 'playlists' && !playlistsUnlocked; return <button key={item.id} disabled={locked} title={locked ? 'Disponible después de una organización verificada' : undefined} className={active === item.id ? 'active' : ''} aria-current={active === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}><Icon name={item.id}/><span>{item.label}{locked ? ' · bloqueadas' : ''}</span>{item.badge && badges[item.badge] > 0 && <b>{badges[item.badge]}</b>}</button>; })}</div>)}
    </nav>
    <div className="sidebar-footer"><button className={active === 'settings' ? 'active' : ''} onClick={() => navigate('settings')}><Icon name="settings"/><span>Configuración</span></button><div className="privacy"><span className="status-dot"/>Solo en este dispositivo</div></div>
  </aside>{open && <button className="sidebar-scrim" aria-label="Cerrar menú" onClick={onClose}/>}</>;
}
