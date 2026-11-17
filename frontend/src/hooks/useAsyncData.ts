import { useEffect, useRef, useState } from 'react';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useAsyncData<T>(loader: () => Promise<T>, deps: ReadonlyArray<unknown> = []) {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null });
  const [tick, setTick] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    let active = true;
    setState((current) => ({ ...current, loading: true, error: null }));

    loaderRef
      .current()
      .then((data) => {
        if (active) setState({ data, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState((current) => ({
          ...current,
          loading: false,
          error: error instanceof Error ? error.message : 'Falha ao carregar dados.'
        }));
      });

    return () => {
      active = false;
    };
  }, [...deps, tick]);

  const refetch = () => setTick((value) => value + 1);

  return { ...state, refetch };
}
