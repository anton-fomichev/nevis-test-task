import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { devFlagsFrom } from './devFlags';
import { fetchClientsReport } from './fetchClientsReport';

export interface UseClientsReportOptions {
  /** The page's query string; dev flags in it are forwarded to the API. Default: the address bar. */
  search?: string | undefined;
}

/**
 * Loads `GET /api/clients` through TanStack Query. Retry policy comes from the QueryClient
 * (one automatic retry in the app, none in tests).
 *
 * `retry()` is what the UI's Retry button calls: it drops the dev flags (`?delay`, `?fail`) that
 * were forwarded on the first request — they simulate a bad server, and "try again" should show
 * the recovery, not replay the simulation (DECISIONS #40) — and refetches.
 */
export function useClientsReport({ search }: UseClientsReportOptions = {}) {
  const [flags, setFlags] = useState(() =>
    devFlagsFrom(search ?? (typeof window === 'undefined' ? '' : window.location.search)),
  );
  const query = useQuery({
    queryKey: ['clients', flags],
    queryFn: ({ signal }) => fetchClientsReport(flags, signal),
  });

  const { refetch } = query;
  const retry = useCallback(() => {
    // A new key is a new query, which fetches on its own; otherwise ask the current one again.
    if (flags) setFlags('');
    else void refetch();
  }, [flags, refetch]);

  return { ...query, retry };
}
