import { useEffect, useState } from 'react';
import { Icon } from '../../components/Icon';
import { Notice } from '../../components/Primitives';
import { api } from '../../lib/api';
import { formatBytes, humanizePhase } from '../../lib/library';
import type { RootGrant, ScanJob, Stats } from '../../types';

function StatCard({ label, value, note, accent }: { label: string; value: string | number; note?: string; accent?: boolean }) {
  return <article className={`stat-card ${accent ? 'accent' : ''}`}><p>{label}</p><strong>{value}</strong>{note && <span>{note}</span>}</article>;
}

export function ScanProgress({ job, onChanged }: { job: ScanJob; onChanged: (job: ScanJob) => void }) {
  const determinate = job.discovered > 0;
  const percent = determinate ? Math.min(100, Math.round((job.processed / job.discovered) * 100)) : 0;
  const action = async (name: 'pause' | 'resume' | 'cancel') => onChanged(await api.scanAction(job.id, name));
  return <section className="progress-card" aria-labelledby="scan-title">
    <div className="progress-head"><div><p className="eyebrow">Análisis en curso</p><h2 id="scan-title">{humanizePhase(job.phase)}</h2></div><strong>{determinate ? `${percent}%` : 'Explorando'}</strong></div>
    <div className={`progress-track ${!determinate ? 'indeterminate' : ''}`} role="progressbar" aria-valuemin={0} aria-valuemax={determinate ? job.discovered : undefined} aria-valuenow={determinate ? job.processed : undefined}><i style={determinate ? { width: `${percent}%` } : undefined}/></div>
    <div className="progress-meta"><span>{job.processed.toLocaleString('es-ES')} procesados</span><span>{job.discovered.toLocaleString('es-ES')} descubiertos</span><span>{job.errors} errores</span></div>
    <div className="button-row">{job.state === 'paused' ? <button className="button secondary" onClick={() => void action('resume')}><Icon name="play"/>Continuar</button> : <button className="button secondary" onClick={() => void action('pause')}><Icon name="pause"/>Pausar</button>}<button className="button ghost danger-text" onClick={() => void action('cancel')}><Icon name="stop"/>Cancelar</button></div>
  </section>;
}

export function Dashboard({ stats, roots, scan, onRootsChanged, onScanChanged, onNavigate }: { stats: Stats; roots: RootGrant[]; scan: ScanJob | null; onRootsChanged: () => void; onScanChanged: (job: ScanJob) => void; onNavigate: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'error' | 'success' | 'warning'; text: string } | null>(null);
  const source = roots.find((root) => root.role === 'source');

  useEffect(() => {
    if (!scan || !['running', 'queued', 'cancel_requested'].includes(scan.state)) return;
    const timer = window.setInterval(() => void api.currentScan().then((next) => next && onScanChanged(next)).catch(() => undefined), 1500);
    return () => window.clearInterval(timer);
  }, [scan, onScanChanged]);

  const selectAndScan = async () => {
    setBusy('native'); setMessage(null);
    try {
      const selected = await api.authorizeRoot('source');
      await onRootsChanged();
      setBusy('scan');
      onScanChanged(await api.scan(selected.id));
      setMessage({ tone: 'success', text: 'Biblioteca seleccionada y analizada. Los archivos originales permanecen intactos.' });
    }
    catch (error) { setMessage({ tone: 'error', text: error instanceof Error ? error.message : 'No se pudo seleccionar o analizar la carpeta' }); }
    finally { setBusy(null); }
  };
  const startScan = async () => {
    if (!source) return;
    setBusy('scan');
    try { onScanChanged(await api.scan(source.id)); } catch (error) { setMessage({ tone: 'error', text: error instanceof Error ? error.message : 'No se pudo iniciar el análisis' }); }
    finally { setBusy(null); }
  };

  const activeScan = scan && !['completed', 'cancelled', 'failed'].includes(scan.state);
  if (!stats.audioFiles && !activeScan) return <div className="dashboard-empty">
    <div className="hero-copy"><div className="kawaii-sky" aria-hidden="true"><span>🦄</span><span>🌈</span><span>✨</span><span>🎀</span></div><p className="eyebrow">Biblioteca mágica local</p><h1>Escucha lo que tienes.<br/><em>Ordena lo que amas.</em></h1><p>Analiza metadatos, encuentra duplicados y diseña una biblioteca clara sin modificar un solo archivo hasta que apruebes el plan.</p><div className="trust-list"><span><Icon name="check"/>Primero, solo lectura</span><span><Icon name="check"/>Nada de audio sale del equipo</span><span><Icon name="check"/>Cada cambio se revisa</span></div></div>
    <section className="onboarding-card" aria-labelledby="start-title"><span className="step-number">01</span><p className="eyebrow">Empezar</p><h2 id="start-title">Elige tu biblioteca</h2><p className="muted">Selecciona tu carpeta en el cuadro de macOS. RESONANCE la analizará inmediatamente en modo de solo lectura.</p>
      <button className="button primary wide" onClick={() => void selectAndScan()} disabled={busy !== null}><Icon name="folder"/>{busy === 'native' ? 'Abriendo selector…' : busy === 'scan' ? 'Analizando biblioteca…' : 'Seleccionar carpeta de música'}</button>
      {source && <div className="path-confirmed"><Icon name="check"/><span><small>Origen autorizado</small><code>{source.path}</code></span></div>}
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
    </section>
  </div>;

  return <div className="page-stack"><header className="page-header"><div><p className="eyebrow">Resumen local</p><h1>Biblioteca</h1><p>Una lectura honesta de tu colección, sin datos de demostración.</p></div><button className="button primary" disabled={!source || Boolean(activeScan)} onClick={() => void startScan()}><Icon name="play"/>Analizar de nuevo</button></header>
    {activeScan && <ScanProgress job={scan} onChanged={onScanChanged}/>} 
    {scan?.audit && <Notice tone="success">Revisión total: {scan.audit.audioFiles?.toLocaleString('es-ES')} audios, {formatBytes(scan.audit.audioBytes ?? stats.bytes)} leídos; {scan.audit.nonAudioFiles?.toLocaleString('es-ES')} archivos no-audio ignorados; {scan.errors} errores.</Notice>}
    <section className="stats-grid" aria-label="Estadísticas de biblioteca"><StatCard label="Audio detectado" value={stats.audioFiles.toLocaleString('es-ES')} note={formatBytes(stats.bytes)} accent/><StatCard label="Artistas" value={stats.artists.toLocaleString('es-ES')}/><StatCard label="Álbumes" value={stats.albums.toLocaleString('es-ES')}/><StatCard label="Géneros" value={stats.genres.toLocaleString('es-ES')}/><StatCard label="Completas" value={stats.complete.toLocaleString('es-ES')} note={`${stats.incomplete} por revisar`}/><StatCard label="Duplicados" value={stats.duplicates.toLocaleString('es-ES')}/><StatCard label="Sin identificar" value={stats.unidentified.toLocaleString('es-ES')}/><StatCard label="Errores" value={stats.errors.toLocaleString('es-ES')}/></section>
    <section className="editorial-panel"><div><p className="eyebrow">Siguiente paso</p><h2>Revisa antes de organizar</h2><p>La confianza y la fuente aparecen en cada canción. Nada con evidencia insuficiente se incluye en silencio.</p></div><button className="text-link" onClick={onNavigate}>Abrir canciones <Icon name="arrow"/></button></section>
  </div>;
}
