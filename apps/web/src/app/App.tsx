import { useCallback, useEffect, useState } from 'react';
import { Icon } from '../components/Icon';
import { Sidebar } from '../components/Sidebar';
import { Notice } from '../components/Primitives';
import { History } from '../features/history/History';
import { CollectionView } from '../features/library/CollectionView';
import { Dashboard } from '../features/library/Dashboard';
import { PlanPreview } from '../features/organization/PlanPreview';
import { Playlists } from '../features/playlists/Playlists';
import { ProviderSettings } from '../features/settings/ProviderSettings';
import { TrackTable } from '../features/tracks/TrackTable';
import { api } from '../lib/api';
import type { AppSettings, Language, Plan, RootGrant, ScanJob, Stats, ViewId } from '../types';
import { EMPTY_STATS } from '../types';

const titleMap: Record<Language, Record<ViewId, string>> = {
  es: { library: 'Biblioteca', tracks: 'Canciones', artists: 'Artistas', albums: 'Álbumes', genres: 'Géneros', duplicates: 'Duplicados', unidentified: 'Sin identificar', playlists: 'Playlists', history: 'Historial', settings: 'Configuración', organization: 'Organización' },
  en: { library: 'Library', tracks: 'Songs', artists: 'Artists', albums: 'Albums', genres: 'Genres', duplicates: 'Duplicates', unidentified: 'Unidentified', playlists: 'Playlists', history: 'History', settings: 'Settings', organization: 'Organization' },
};
const defaultSettings: AppSettings = { mode: 'simulation', updateTags: false, artwork: false, preserveArtwork: true, preferLossless: true, language: 'es', theme: 'light', provider: { musicbrainzEnabled: false, openaiEnabled: false, webSearchEnabled: false, openaiConfigured: false, model: null, maxRequests: 100, maxWebRequests: 10 } };

export function App() {
  const [view, setView] = useState<ViewId>('library'); const [menuOpen, setMenuOpen] = useState(false);
  const [roots, setRoots] = useState<RootGrant[]>([]); const [stats, setStats] = useState<Stats>(EMPTY_STATS); const [scan, setScan] = useState<ScanJob | null>(null); const [plan, setPlan] = useState<Plan | null>(null);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings); const [connected, setConnected] = useState<boolean | null>(null); const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [auth, setAuth] = useState<'loading' | 'error' | 'ready'>('loading');

  const applySettings = useCallback((value: AppSettings) => { setSettings(value); document.documentElement.dataset.theme = value.theme; document.documentElement.lang = value.language; }, []);
  const loadRoots = useCallback(async () => { const response = await api.roots(); setRoots(response.roots); }, []);
  const loadDashboard = useCallback(async () => {
    const results = await Promise.allSettled([api.health(), api.roots(), api.stats(), api.currentScan(), api.plan(), api.settings()]);
    setConnected(results[0].status === 'fulfilled');
    if (results[1].status === 'fulfilled') setRoots(results[1].value.roots);
    if (results[2].status === 'fulfilled') setStats(results[2].value);
    if (results[3].status === 'fulfilled') setScan(results[3].value);
    if (results[4].status === 'fulfilled') setPlan(results[4].value);
    if (results[5].status === 'fulfilled') applySettings(results[5].value);
    const firstError = results.find((result) => result.status === 'rejected');
    setBootstrapError(firstError?.status === 'rejected' ? (firstError.reason instanceof Error ? firstError.reason.message : 'El servicio local no está disponible') : null);
  }, [applySettings]);
  useEffect(() => { void (async () => { try { await api.bootstrap(); setAuth('ready'); } catch (error) { setBootstrapError(error instanceof Error ? error.message : 'El servicio local no está disponible'); setAuth('error'); } })(); }, []);
  useEffect(() => { if (auth === 'ready') void loadDashboard(); }, [auth, loadDashboard]);

  if (auth !== 'ready') return <main className="pairing-shell"><section className="pairing-card" aria-busy={auth === 'loading'}><div className="brand-mark"><Icon name="wave"/></div><p className="eyebrow">RESONANCE · local service</p><h1>{auth === 'loading' ? 'Abriendo tu biblioteca…' : 'No se pudo conectar'}</h1>{auth === 'error' && <><p className="muted">Comprueba que el servicio local siga abierto y vuelve a intentar.</p><button className="button primary" type="button" onClick={() => window.location.reload()}>Reintentar</button>{bootstrapError && <Notice tone="warning">{bootstrapError}</Notice>}</>}</section></main>;

  const title = titleMap[settings.language][view];
  const resetState = () => { setRoots([]); setStats(EMPTY_STATS); setScan(null); setPlan(null); applySettings(defaultSettings); setView('settings'); };
  let content;
  if (view === 'library') content = <Dashboard stats={stats} roots={roots} scan={scan} onRootsChanged={loadRoots} onScanChanged={setScan} onNavigate={() => setView('tracks')}/>;
  else if (view === 'tracks') content = <TrackTable/>;
  else if (view === 'duplicates') content = <TrackTable initialFilter="duplicates"/>;
  else if (view === 'unidentified') content = <TrackTable initialFilter="review"/>;
  else if (view === 'artists' || view === 'albums' || view === 'genres') content = <CollectionView kind={view}/>;
  else if (view === 'organization') content = <PlanPreview plan={plan} roots={roots} mode={settings.mode} onPlanChanged={setPlan}/>;
  else if (view === 'playlists') content = <Playlists/>;
  else if (view === 'history') content = <History/>;
  else content = <ProviderSettings roots={roots} onRootsChanged={loadRoots} onScanChanged={setScan} onSettingsChanged={applySettings} onReset={resetState}/>;

  return <div className="app-shell"><Sidebar active={view} onNavigate={setView} open={menuOpen} onClose={() => setMenuOpen(false)} badges={{ duplicates: stats.duplicates, unidentified: stats.unidentified }} playlistsUnlocked={stats.playlistsUnlocked} language={settings.language}/><div className="app-main"><header className="topbar"><button className="icon-button menu-button" aria-label="Abrir menú" onClick={() => setMenuOpen(true)}><Icon name="menu"/></button><span className="mobile-title">{title}</span><div className="topbar-spacer"/><span className={`service-state ${connected ? 'online' : ''}`}><i/>{connected === null ? 'Conectando…' : connected ? 'Servicio local' : 'Sin conexión'}</span>{stats.audioFiles > 0 && <button className="button compact" onClick={() => setView('organization')}>Ejecutar <Icon name="arrow"/></button>}</header><main id="main-content">{bootstrapError && view === 'library' && <Notice tone="warning">Parte del servicio no respondió: {bootstrapError}. La interfaz no mostrará datos inventados.</Notice>}{content}</main><footer className="app-footer"><span>RESONANCE</span><span>Local · privado · reversible</span></footer></div></div>;
}
