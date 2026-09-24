import type { Resource } from '@command/shared';
import { emails } from './emails';
import { events } from './events';
import { ganttTasks } from './gantt-tasks';
import { issues } from './issues';
import { projects } from './projects';
import { pulls } from './pulls';
import { reminders } from './reminders';
import { tasks } from './tasks';

export * from './agents';
export * from './actions';
export * from './users';
export * from './user-preferences';
export { emails, events, ganttTasks, issues, projects, pulls, reminders, tasks };

/** The table behind each resource. */
export const RESOURCE_TABLES = {
  emails,
  events,
  pulls,
  issues,
  reminders,
  tasks,
  projects,
  gantt: ganttTasks,
} satisfies Record<Resource, unknown>;

export type ResourceTable = (typeof RESOURCE_TABLES)[Resource];
