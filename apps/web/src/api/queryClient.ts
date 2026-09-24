import { QueryClient } from '@tanstack/react-query';
import { HttpError } from './client';

export const queryKeys = {
  dashboard: ['dashboard'] as const,
  agents: ['agents'] as const,
  preferences: ['preferences'] as const,
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Freshness comes from the SSE stream; this is only a safety net.
      staleTime: 60_000,
      refetchInterval: 5 * 60_000,
      retry: (count, err) => !(err instanceof HttpError && err.status < 500) && count < 3,
    },
  },
});
