import type { z } from 'zod';
import type { Resource } from './common';
import { CalendarEventInput } from './event';
import { EmailInput, EmailPatch } from './email';
import { GanttTaskInput, GanttTaskPatch } from './gantt-task';
import { IssueInput, IssuePatch } from './issue';
import { ProjectInput } from './project';
import { PullRequestInput, PullRequestPatch } from './pull-request';
import { ReminderInput, ReminderPatch } from './reminder';
import { TaskInput, TaskPatch } from './task';

interface ResourceSchemas {
  /** What an agent sends to PUT /api/ingest/:resource. */
  input: z.ZodType;
  /** What the user may change with PATCH /api/:resource/:id; null when read-only. */
  patch: z.ZodType | null;
}

export const RESOURCE_SCHEMAS: Record<Resource, ResourceSchemas> = {
  emails: { input: EmailInput, patch: EmailPatch },
  events: { input: CalendarEventInput, patch: null },
  pulls: { input: PullRequestInput, patch: PullRequestPatch },
  issues: { input: IssueInput, patch: IssuePatch },
  reminders: { input: ReminderInput, patch: ReminderPatch },
  tasks: { input: TaskInput, patch: TaskPatch },
  projects: { input: ProjectInput, patch: null },
  gantt: { input: GanttTaskInput, patch: GanttTaskPatch },
};
