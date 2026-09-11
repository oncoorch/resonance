import { useCallback, useEffect, useState } from 'react';

export function useResource<T>(loader: () => Promise<T>, dependencies: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await loader()); } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo conectar con el servicio local'); }
    finally { setLoading(false); }
  }, dependencies);
  useEffect(() => { void reload(); }, [reload]);
  return { data, setData, loading, error, reload };
}
