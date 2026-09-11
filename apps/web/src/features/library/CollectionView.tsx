import { useEffect, useState } from 'react';
import { Icon } from '../../components/Icon';
import { EmptyState, Notice } from '../../components/Primitives';
import { api } from '../../lib/api';

const TITLES = { artists: ['Artistas', 'Voces y créditos principales'], albums: ['Álbumes', 'Ediciones conservadas por separado'], genres: ['Géneros', 'Originales y normalizados, sin perder matices'] } as const;

export function CollectionView({ kind }: { kind: keyof typeof TITLES }) {
  const [items, setItems] = useState<Array<{ id: string; name: string; subtitle?: string; count: number }>>([]); const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(true); const [query, setQuery] = useState('');
  useEffect(() => { setLoading(true); void api.collection(kind).then((response) => { setItems(response.items); setError(null); }).catch((reason) => setError(reason instanceof Error ? reason.message : 'No se pudo cargar la vista')).finally(() => setLoading(false)); }, [kind]);
  const visible = items.filter((item) => item.name.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')));
  return <div className="page-stack"><header className="page-header"><div><p className="eyebrow">Explorar catálogo</p><h1>{TITLES[kind][0]}</h1><p>{TITLES[kind][1]}</p></div></header><label className="search-field standalone"><Icon name="search"/><span className="sr-only">Buscar</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Buscar ${TITLES[kind][0].toLowerCase()}…`}/></label>{error && <Notice tone="error">{error}</Notice>}{!loading && !error && visible.length === 0 ? <EmptyState icon={kind} title={`No hay ${TITLES[kind][0].toLowerCase()}`}>Esta vista se llenará con agregados reales después del análisis.</EmptyState> : <section className="collection-grid">{visible.map((item, index) => <article key={item.id}><div className={`collection-art art-${index % 5}`}><span>{item.name.slice(0, 2).toUpperCase()}</span><Icon name={kind}/></div><div><h2>{item.name}</h2>{item.subtitle && <p>{item.subtitle}</p>}<span>{item.count} {item.count === 1 ? 'canción' : 'canciones'}</span></div></article>)}</section>}</div>;
}
