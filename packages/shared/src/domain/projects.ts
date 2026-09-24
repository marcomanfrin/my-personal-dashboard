import type { GanttTask } from '../schemas/gantt-task';
import type { Project } from '../schemas/project';
import { ms } from './dates';
import { ganttStatus, STATUS_RANK, type GanttStatus } from './status';

export interface ProjectSummary {
  id: string;
  key: string;
  name: string;
  area: string;
  owner: string;
  /** Progress of the project's tasks weighted by duration, 0..100. */
  progress: number;
  /** Worst task status; "not-started" is reported as "on-track". */
  health: Exclude<GanttStatus, 'not-started'>;
  openTasks: number;
  /** The open task that ends first. */
  nextTaskId: string | null;
  taskIds: string[];
}

/** Aggregate per-project numbers from the Gantt tasks. Projects without tasks are left out. */
export function projectSummaries(projects: Project[], gantt: GanttTask[], now: Date): ProjectSummary[] {
  return projects
    .map((p) => {
      const tasks = gantt.filter((t) => t.projectKey === p.key);
      const dur = (t: GanttTask) => ms(t.end) - ms(t.start);
      const weight = tasks.reduce((a, t) => a + dur(t), 0) || 1;
      const progress = Math.round(tasks.reduce((a, t) => a + t.progress * dur(t), 0) / weight);
      const worst = tasks.map((t) => ganttStatus(t, now)).sort((a, b) => STATUS_RANK[a] - STATUS_RANK[b])[0];
      const open = tasks.filter((t) => t.progress < 100);
      const next = [...open].sort((a, b) => ms(a.end) - ms(b.end))[0];
      return {
        id: p.id,
        key: p.key,
        name: p.name,
        area: p.area,
        owner: p.owner,
        progress,
        health: !worst || worst === 'not-started' ? 'on-track' : worst,
        openTasks: open.length,
        nextTaskId: next?.id ?? null,
        taskIds: tasks.map((t) => t.id),
      } satisfies ProjectSummary;
    })
    .filter((p) => p.taskIds.length > 0);
}
