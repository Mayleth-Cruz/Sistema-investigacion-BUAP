import { useEffect, useState } from 'react';

/**
 * Carga datos con un `fetcher` asíncrono. Devuelve el último resultado
 * disponible (para no parpadear al filtrar), el estado de carga y `reload`.
 * Un resultado `null` significa que el backend no respondió o la sesión expiró.
 */
export function useEje3Data(fetcher, deps = []) {
  const [tick, setTick] = useState(0);
  const key = `${JSON.stringify(deps)}#${tick}`;
  const [result, setResult] = useState({ key: null, data: null });

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(fetcher)
      .then((data) => {
        if (!cancelled) setResult({ key, data: data === undefined ? null : data });
      })
      .catch(() => {
        if (!cancelled) setResult({ key, data: null });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const loading = result.key !== key;
  return {
    data: result.data,
    loading,
    failed: !loading && result.data === null,
    reload: () => setTick((t) => t + 1)
  };
}

/** Devuelve `value` tras `delay` ms sin cambios (para buscadores). */
export function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export const formatNumber = (n) => Number(n || 0).toLocaleString('es-MX');
