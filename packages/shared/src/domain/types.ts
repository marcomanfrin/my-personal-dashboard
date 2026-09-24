import type { CalendarEvent } from '../schemas/event';
import type { Email } from '../schemas/email';
import type { GanttTask } from '../schemas/gantt-task';
import type { Issue } from '../schemas/issue';
import type { Project } from '../schemas/project';
import type { PullRequest } from '../schemas/pull-request';
import type { Reminder } from '../schemas/reminder';
import type { Task } from '../schemas/task';

/** Everything the dashboard shows, one list per resource. `gantt` holds only the owner's tasks. */
export interface DashboardData {
  emails: Email[];
  events: CalendarEvent[];
  pulls: PullRequest[];
  issues: Issue[];
  reminders: Reminder[];
  tasks: Task[];
  projects: Project[];
  gantt: GanttTask[];
}
