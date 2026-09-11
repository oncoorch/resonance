import { useEffect, useState } from 'react';
import { EmptyState, Notice } from '../../components/Primitives';
import { api } from '../../lib/api';
import type { HistoryEntry } from '../../types';

export const canRollback = (entry: Pick<HistoryEntry, 'rollbackAvailable'>): boolean => entry.rollbackAvailable === true;

export function History() {
  const [items, setItems] = useState<HistoryEntry[]>([]); const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState<string | null>(null);
  const load = () => api.history().then((response) => setItems(response.items)).catch((reason) => setError(reason instanceof Error ? reason.message : 'No se pudo leer el historial'));
  useEffect(() => { void load(); }, []);
  const rollback = async (entry: HistoryEntry) => { if (!window.confirm('Se eliminarán únicamente copias cuyo hash final siga intacto. Los originales no se tocarán. ¿Continuar?')) return; setBusy(entry.id); setError(null); try { const result = await api.rollbackPlan(entry.id); if (result.blocked) setError(`${result.blocked} archivo(s) quedaron bloqueados para revisión manual.`); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo recuperar la operación'); } finally { setBusy(null); } };
  return <div className="page-stack"><header className="page-header"><div><p className="eyebrow">Journal verificable</p><h1>Historial</h1><p>Operaciones, verificaciones y recuperaciones sin borrar la auditoría.</p></div></header>{error && <Notice tone="error">{error}</Notice>}{!error && items.length === 0 ? <EmptyState icon="history" title="Todavía no hay operaciones">Los análisis y organizaciones aparecerán aquí con su estado real.</EmptyState> : <section className="timeline">{items.map((entry) => <article key={entry.id}><i/><div><p className="eyebrow">{new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.createdAt))}</p><h2>{entry.type}</h2><p>{entry.files} archivos · {entry.verified} verificados</p>{canRollback(entry) && <button className="button secondary compact" disabled={busy === entry.id} onClick={() => void rollback(entry)}>{busy === entry.id ? 'Verificando…' : 'Rollback verificado'}</button>}</div><span className={`state-pill state-${entry.state}`}>{entry.state}</span></article>)}</section>}</div>;
}
