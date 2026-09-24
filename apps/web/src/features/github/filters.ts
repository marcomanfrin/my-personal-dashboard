import { byLevel, ms, prLevel, type Issue, type PullRequest } from '@argus/shared';

export type PrFilterId = 'all' | 'review' | 'mine' | 'blocked' | 'failing';
export type PrSortId = 'priority' | 'oldest' | 'repo';

export const PR_FILTERS: { id: PrFilterId; label: string; test: (p: PullRequest) => boolean }[] = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'review', label: 'To review', test: (p) => p.reviewRequested },
  { id: 'mine', label: 'Involved', test: (p) => p.involved && !p.reviewRequested },
  { id: 'blocked', label: 'Blocked', test: (p) => p.status === 'blocked' },
  { id: 'failing', label: 'Failing checks', test: (p) => p.checks.failed > 0 },
];

export const PR_SORTS: Record<PrSortId, { label: string; compare: (now: Date) => (a: PullRequest, b: PullRequest) => number }> = {
  priority: {
    label: 'Sort: priority',
    compare: (now) => (a, b) => byLevel(prLevel(a, now), prLevel(b, now)) || ms(a.createdAt) - ms(b.createdAt),
  },
  oldest: { label: 'Sort: oldest first', compare: () => (a, b) => ms(a.createdAt) - ms(b.createdAt) },
  repo: { label: 'Sort: repository', compare: () => (a, b) => a.repo.localeCompare(b.repo) || a.number - b.number },
};

/** Open errors first, then by level, newest first. */
export const sortIssues = (list: Issue[]) =>
  [...list].sort(
    (a, b) =>
      Number(a.acknowledged) - Number(b.acknowledged) || byLevel(a.level, b.level) || ms(b.createdAt) - ms(a.createdAt),
  );

/** "hmi-5309" from "sistec/hmi-5309". */
export const repoName = (repo: string) => repo.split('/')[1] ?? repo;
