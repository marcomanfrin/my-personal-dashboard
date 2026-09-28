import type {
  Agent,
  AgentRun,
  DashboardData,
  DashboardResponse,
  EmailPatch,
  PreferencesPatch,
  PreferencesResponse,
  GanttTaskPatch,
  Job,
  JobApprove,
  JobCreate,
  JobReject,
  JobRevise,
  IssuePatch,
  PullRequestPatch,
  Reminder,
  ReminderCreate,
  ReminderPatch,
  TaskPatch,
} from '@argus/shared';
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

  jobs: () => api.get<Job[]>('/jobs'),
  createJob: (input: JobCreate) => api.post<Job>('/jobs', input),
  approveJob: (id: string, body: JobApprove = {}) => api.post<Job>(`/jobs/${id}/approve`, body),
  reviseJob: (id: string, body: JobRevise) => api.post<Job>(`/jobs/${id}/revise`, body),
  rejectJob: (id: string, body: JobReject = {}) => api.post<Job>(`/jobs/${id}/reject`, body),
  cancelJob: (id: string) => api.post<Job>(`/jobs/${id}/cancel`),

  preferences: () => api.get<PreferencesResponse>('/preferences'),
  patchPreferences: (patch: PreferencesPatch) => api.patch<PreferencesResponse>('/preferences', patch),
};
