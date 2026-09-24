import type {
  Agent,
  AgentRun,
  DashboardData,
  DashboardResponse,
  EmailPatch,
  GanttTaskPatch,
  IssuePatch,
  PullRequestPatch,
  Reminder,
  ReminderCreate,
  ReminderPatch,
  TaskPatch,
} from '@command/shared';
import { api } from './client';

/** Resources the user can change, with their PATCH body. */
export interface PatchMap {
  emails: EmailPatch;
  pulls: PullRequestPatch;
  issues: IssuePatch;
  reminders: ReminderPatch;
  tasks: TaskPatch;
  gantt: GanttTaskPatch;
}
export type PatchableResource = keyof PatchMap;
export type RecordOf<R extends keyof DashboardData> = DashboardData[R][number];

export interface Rescheduled {
  id: string;
  key: string;
  start: string;
  end: string;
  previous: { start: string; end: string };
}

export const endpoints = {
  dashboard: () => api.get<DashboardResponse>('/dashboard'),
  agents: () => api.get<{ agents: Agent[]; runs: (AgentRun & { agent: string })[] }>('/agents'),

  patch: <R extends PatchableResource>(resource: R, id: string, patch: PatchMap[R]) =>
    api.patch<RecordOf<R>>(`/${resource}/${id}`, patch),

  createReminder: (input: ReminderCreate) => api.post<Reminder>('/reminders', input),
  deleteReminder: (id: string) => api.delete(`/reminders/${id}`),
  recalcGantt: () => api.post<{ moved: Rescheduled[] }>('/gantt/recalc'),
};
