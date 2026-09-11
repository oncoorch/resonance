import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../../components/Icon';
import { Dialog, EmptyState, Notice } from '../../components/Primitives';
import { api } from '../../lib/api';
import { formatBytes } from '../../lib/library';
import type { Mode, Plan, RootGrant } from '../../types';

type WorkOption = 'copy' | 'metadata' | 'duplicates' | 'playlists' | 'tags';
const OPTIONS: Array<{ id: WorkOption; label: string; description: string; disabled?: boolean }> = [
  { id: 'copy', label: 'Copiar y renombrar', description: 'Crea la biblioteca organizada en el destino.' },
  { id: 'metadata', label: 'Leer metadatos', description: 'Usa artista, álbum, título y calidad detectados.' },
  { id: 'duplicates', label: 'Detectar duplicados', description: 'Agrupa por hash y evita trabajos redundantes.' },
  { id: 'playlists', label: 'Preparar playlists', description: 'Se desbloquea tras una ejecución verificada.' },
  { id: 'tags', label: 'Escribir tags', description: 'Bloqueado hasta certificación por formato.', disabled: true },
];

function PercentCard({ label, done, total }: { label: string; done: number; total: number }) {
  const percent = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return <article className="progress-card compact-progress"><div className="progress-head"><div><p className="eyebrow">{label}</p><h2>{total ? `${done.toLocaleString('es-ES')} / ${total.toLocaleString('es-ES')}` : 'Pendiente'}</h2></div><strong>{percent}%</strong></div><div className={`progress-track ${total ? '' : 'indeterminate'}`}><i style={total ? { width: `${percent}%` } : undefined}/></div></article>;
}

export function PlanPreview({ plan, roots, mode, onPlanChanged }: { plan: Plan | null; roots: RootGrant[]; mode: Mode; onPlanChanged: (plan: Plan) => void }) {
  const [dialog, setDialog] = useState<'approve' | 'apply' | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<Record<WorkOption, boolean>>({ copy: true, metadata: true, duplicates: true, playlists: false, tags: false });
  const source = roots.find((root) => root.role === 'source'); const destination = roots.find((root) => root.role === 'destination');
  const applyDone = useMemo(() => plan?.items.filter((item) => item.state === 'committed').length ?? 0, [plan]);
  useEffect(() => {
    if (!plan || !['applying', 'cancel_requested'].includes(plan.state)) return;
    const timer = window.setInterval(() => void api.plan().then((next) => next && onPlanChanged(next)).catch(() => undefined), 1200);
    return () => window.clearInterval(timer);
  }, [plan, onPlanChanged]);
  const authorize = async (role: RootGrant['role']) => { setBusy(true); setError(null); try { await api.authorizeRoot(role); window.location.reload(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo autorizar la carpeta'); } finally { setBusy(false); } };
  const execute = async () => { if (!source || !destination) { setError('Primero elige origen y destino.'); return; } setBusy(true); setError(null); try { onPlanChanged(await api.createPlan(destination.id, mode)); } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo crear el plan'); } finally { setBusy(false); } };
  const approve = async () => { if (!plan) return; setBusy(true); try { onPlanChanged(await api.approvePlan(plan.id, plan.revision, mode)); setDialog(null); } catch (reason) { setError(reason instanceof Error ? reason.message : 'El plan no pudo aprobarse'); } finally { setBusy(false); } };
  const apply = async () => { if (!plan) return; setBusy(true); try { await api.applyPlan(plan.id, plan.revision); setDialog(null); onPlanChanged({ ...plan, state: 'applying' }); } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo aplicar el plan'); } finally { setBusy(false); } };
  const stop = async () => { if (!plan) return; setBusy(true); try { await api.cancelPlan(plan.id); onPlanChanged({ ...plan, state: 'cancel_requested' }); } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo detener'); } finally { setBusy(false); } };

  return <div className="page-stack"><header className="page-header"><div><p className="eyebrow">Centro de ejecución</p><h1>Ejecutar RESONANCE</h1><p>El flujo completo está aquí: elegir carpetas, revisar opciones, ejecutar revisión, aprobar y aplicar.</p></div>{plan && <span className="revision">Revisión {plan.revision}</span>}</header>
    <section className="execution-map"><article><span>1</span><strong>Carpetas</strong><p>Origen: {source?.path ?? 'pendiente'} · Destino: {destination?.path ?? 'pendiente'}</p><div className="button-row"><button className="button secondary" onClick={() => void authorize('source')} disabled={busy}><Icon name="folder"/>Origen</button><button className="button secondary" onClick={() => void authorize('destination')} disabled={busy}><Icon name="folder"/>Destino</button></div></article><article><span>2</span><strong>Qué procesar</strong><p>Selecciona los cambios que RESONANCE debe preparar.</p></article><article><span>3</span><strong>Revisión</strong><p>Calcula rutas, conflictos, tamaño y metadatos. No escribe.</p></article><article><span>4</span><strong>Aplicación</strong><p>Copia, verifica y muestra progreso. STOP corta antes del siguiente archivo.</p></article></section>
    <section className="options-grid">{OPTIONS.map((option) => <label key={option.id} className={option.disabled ? 'disabled' : ''}><input type="checkbox" checked={options[option.id]} disabled={option.disabled} onChange={(event) => setOptions((current) => ({ ...current, [option.id]: event.target.checked }))}/><span><strong>{option.label}</strong><small>{option.description}</small></span></label>)}</section>
    <section className="plan-controls"><div><span className="control-index">RUN</span><div><strong>Ejecutar revisión funcional</strong><p>Lee origen/destino, calcula nombres finales, conflictos y conteos. Todavía no escribe archivos.</p></div></div><button className="button primary" onClick={() => void execute()} disabled={!source || !destination || busy || !options.copy}>{busy ? 'Procesando…' : 'EJECUTAR REVISIÓN'}</button></section>
    {error && <Notice tone="error">{error}</Notice>}
    {!source || !destination ? <Notice tone="warning">Falta elegir {source ? 'destino' : destination ? 'origen' : 'origen y destino'}. Usa los botones de arriba; no necesitas buscar otra pantalla.</Notice> : null}
    {!plan ? <EmptyState icon="duplicates" title="Aún no hay revisión">Cuando ejecutes la revisión verás conteos, conflictos y el botón para aprobar/aplicar.</EmptyState> : <>
      <div className="plan-summary"><article><span>Incluidos</span><strong>{plan.items.filter((item) => item.selected).length}</strong></article><article><span>Advertencias</span><strong>{plan.warnings ?? 0}</strong></article><article><span>Bloqueos</span><strong className={plan.conflicts ? 'danger-text' : ''}>{plan.conflicts}</strong></article><article><span>Espacio estimado</span><strong>{formatBytes(plan.estimatedBytes)}</strong></article></div>
      <PercentCard label={plan.state === 'applying' || plan.state === 'cancel_requested' ? 'Ejecución' : 'Revisión preparada'} done={plan.state === 'applying' || plan.state === 'cancel_requested' ? applyDone : plan.items.length} total={plan.items.length}/>
      {plan.audit && <Notice tone="success">Auditoría: {plan.audit.audioFiles?.toLocaleString('es-ES') ?? plan.items.length.toLocaleString('es-ES')} archivos de audio, {formatBytes(plan.audit.audioBytes ?? plan.estimatedBytes)} de audio, {plan.audit.nonAudioFiles?.toLocaleString('es-ES') ?? 0} archivos no-audio ignorados.</Notice>}
      {plan.conflicts > 0 && <Notice tone="warning">“Destino bloqueado” significa que se sobrescribiría un archivo diferente o dos canciones terminan con el mismo nombre. Corrige metadatos o elige otro destino.</Notice>}
      <section className="plan-list" aria-label="Cambios propuestos">{plan.items.slice(0, 120).map((item) => <article className={item.conflict ? 'has-conflict' : item.warning ? 'has-warning' : item.state === 'committed' ? 'has-success' : ''} key={item.id}><div className="path-flow"><span><b>ORIGINAL</b><code>{item.originalPath}</code></span><i aria-hidden="true">↓</i><span><b>DESTINO</b><code>{item.destinationPath}</code></span></div>{item.state && <div className="conflict warning"><Icon name="check"/>Estado: {item.state}</div>}{item.conflict && <div className="conflict"><Icon name="warning"/>{item.conflict}</div>}{item.warning && <div className="conflict warning"><Icon name="check"/>{item.warning}</div>}</article>)}</section>
      <footer className="sticky-actions"><div><strong>{plan.state === 'approved' ? 'Revisión aprobada: pulsa APLICAR Y EJECUTAR' : plan.state === 'applying' ? 'Ejecutando cambios verificados' : 'Aprobar no ejecuta cambios'}</strong><p>El botón principal para hacer el trabajo está aquí abajo.</p></div>{plan.state === 'applying' || plan.state === 'cancel_requested' ? <button className="button danger" onClick={() => void stop()} disabled={busy || plan.state === 'cancel_requested'}><Icon name="stop"/>STOP</button> : plan.state === 'approved' ? <button className="button primary" disabled={plan.conflicts > 0} onClick={() => setDialog('apply')}>APLICAR Y EJECUTAR</button> : <button className="button primary" disabled={plan.conflicts > 0 || plan.state === 'stale'} onClick={() => setDialog('approve')}>REVISAR Y APROBAR</button>}</footer>
    </>}
    <Dialog open={dialog === 'approve'} title="Aprobar esta revisión" eyebrow="Confirmación 1 de 2" onClose={() => setDialog(null)} actions={<><button className="button ghost" onClick={() => setDialog(null)}>Volver</button><button className="button primary" onClick={() => void approve()} disabled={busy}>Solo aprobar</button></>}><p>Esto congela la lista. Todavía NO copia archivos.</p></Dialog>
    <Dialog open={dialog === 'apply'} danger title="Aplicar y ejecutar" eyebrow="Confirmación final" onClose={() => setDialog(null)} actions={<><button className="button ghost" onClick={() => setDialog(null)}>Cancelar</button><button className="button danger" onClick={() => void apply()} disabled={busy || mode === 'simulation'}>Sí, aplicar y ejecutar</button></>}><Notice tone="warning">Escribe solo en el destino autorizado. No borra originales ni sobrescribe archivos diferentes.</Notice><p>Se ejecutará la revisión {plan?.revision}. Verás porcentaje y puedes usar STOP.</p></Dialog>
  </div>;
}
