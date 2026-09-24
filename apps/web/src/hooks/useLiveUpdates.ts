import type { StreamEventType } from '@command/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { queryKeys } from '../api/queryClient';
import { useSession } from '../auth/AuthGate';
import { hasUnsavedPreferences } from './usePreference';

export type LiveStatus = 'connecting' | 'live' | 'offline';

const REFRESHING: StreamEventType[] = ['data.changed', 'agent.run', 'action.updated'];
/** Agents write in bursts: coalesce a burst into one refetch. */
const DEBOUNCE_MS = 300;

/**
 * Subscribes to /api/stream and refetches the dashboard when agents (or other
 * tabs) change data. Reconnects with the new token each time the session renews.
 */
export function useLiveUpdates(): LiveStatus {
  const qc = useQueryClient();
  const token = useSession()?.accessToken;
  const [status, setStatus] = useState<LiveStatus>('connecting');

  useEffect(() => {
    if (!token) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const invalidate = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        void qc.invalidateQueries({ queryKey: queryKeys.dashboard });
        void qc.invalidateQueries({ queryKey: queryKeys.agents });
      }, DEBOUNCE_MS);
    };

    // EventSource cannot send headers: the stream route accepts ?access_token=.
    const es = new EventSource(`/api/stream?access_token=${encodeURIComponent(token)}`);
    setStatus('connecting');
    es.addEventListener('ready', () => {
      setStatus('live');
      // Catch up on anything missed while disconnected.
      invalidate();
    });
    for (const type of REFRESHING) es.addEventListener(type, invalidate);
    // Saved in another tab or device. Our own save echoes back too: skip it while
    // a newer local change is still queued, or the refetch would undo it.
    es.addEventListener('preferences.changed', () => {
      if (!hasUnsavedPreferences()) void qc.invalidateQueries({ queryKey: queryKeys.preferences });
    });
    es.onerror = () => setStatus(es.readyState === EventSource.CLOSED ? 'offline' : 'connecting');

    return () => {
      clearTimeout(timer);
      es.close();
    };
  }, [token, qc]);

  return status;
}
