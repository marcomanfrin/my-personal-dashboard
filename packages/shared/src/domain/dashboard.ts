import { attentionItems, upcomingItems, type AttentionItem } from './attention';
import { kpis, type Kpi } from './kpis';
import { projectSummaries, type ProjectSummary } from './projects';
import { depConflicts } from './status';
import type { DashboardData } from './types';

export interface DashboardInsights {
  attention: AttentionItem[];
  upcoming: AttentionItem[];
  kpis: Kpi[];
  projects: ProjectSummary[];
  /** Gantt dependency conflicts as `successorKey<predecessorKey`. */
  conflicts: string[];
}

/** Every derived view of the dashboard, computed once from the raw data. */
export function buildInsights(data: DashboardData, now: Date): DashboardInsights {
  const projects = projectSummaries(data.projects, data.gantt, now);
  return {
    attention: attentionItems(data, now),
    upcoming: upcomingItems(data, now),
    kpis: kpis(data, projects, now),
    projects,
    conflicts: depConflicts(data.gantt),
  };
}
