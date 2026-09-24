import {
  buildInsights,
  type DashboardData,
  type DashboardInsights,
  type SourceStatus,
  type UserProfile,
} from '@command/shared';
import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { endpoints } from '../api/endpoints';
import { queryKeys } from '../api/queryClient';
import { useLiveUpdates, type LiveStatus } from './useLiveUpdates';
import { useNow } from './useNow';

export interface DashboardView {
  data: DashboardData;
  /**
   * Attention, KPIs, projects: recomputed in the browser with the same domain
   * code as the server, so optimistic changes and the passing of time show at once.
   */
  insights: DashboardInsights;
  now: Date;
  user: UserProfile;
  sources: SourceStatus[];
  live: LiveStatus;
  updatedAt: number;
}

const Ctx = createContext<DashboardView | null>(null);

export function useDashboardQuery() {
  return useQuery({ queryKey: queryKeys.dashboard, queryFn: endpoints.dashboard });
}

/** Loads the dashboard, keeps it live, and renders `children` once data is there. */
export function DashboardProvider({
  children,
  fallback,
  error,
}: {
  children: ReactNode;
  fallback: ReactNode;
  error: (retry: () => void) => ReactNode;
}) {
  const q = useDashboardQuery();
  const live = useLiveUpdates();
  const now = useNow();

  const value = useMemo<DashboardView | null>(() => {
    if (!q.data) return null;
    return {
      data: q.data.data,
      insights: buildInsights(q.data.data, now),
      now,
      user: q.data.user,
      sources: q.data.sources,
      live,
      updatedAt: q.dataUpdatedAt,
    };
  }, [q.data, q.dataUpdatedAt, now, live]);

  if (!value) return q.isError ? error(() => void q.refetch()) : fallback;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDashboard(): DashboardView {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useDashboard outside DashboardProvider');
  return ctx;
}
