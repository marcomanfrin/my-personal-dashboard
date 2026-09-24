import type { GanttStatus, GanttTask, ProjectSummary } from '@command/shared';

export interface GanttGroup {
  project: ProjectSummary;
  tasks: GanttTask[];
}

/** Colour class of a Gantt status: bars paint "on track" blue rather than accent. */
export const barStatusClass = (st: GanttStatus) => (st === 'on-track' ? 'st-gantt-on-track' : `st-${st}`);
