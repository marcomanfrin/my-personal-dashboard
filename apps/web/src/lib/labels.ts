import type {
  AttentionItem,
  AttentionLevel,
  EventCategory,
  GanttStatus,
  IssueKind,
  JobKind,
  JobStatus,
  MailCategory,
  PrState,
  Priority,
  PullRequestStatus,
  Resource,
  TaskColumn,
} from '@argus/shared';
import type { IconName } from '../components/ui/icons';

export const LEVEL_LABEL: Record<Priority, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  normal: 'Normal',
};

export const ATTENTION_LEVEL_LABEL: Record<AttentionLevel, string> = { ...LEVEL_LABEL, upcoming: 'Upcoming' };

export const MAIL_CAT_LABEL: Record<MailCategory, string> = {
  urgent: 'Urgent',
  'needs-reply': 'Needs reply',
  fyi: 'FYI',
  waiting: 'Waiting',
  archived: 'Archived',
};

export const CAT_LABEL: Record<EventCategory, string> = {
  meeting: 'Meeting',
  focus: 'Focus',
  personal: 'Personal',
  study: 'Study',
  deadline: 'Deadline',
};

export const STATUS_LABEL: Record<GanttStatus, string> = {
  done: 'Done',
  'on-track': 'On track',
  'at-risk': 'At risk',
  delayed: 'Delayed',
  'not-started': 'Not started',
};

export const STATE_LABEL: Record<PrState, string> = {
  success: 'Passing',
  error: 'Failing',
  warning: 'Warning',
  blocked: 'Blocked',
  pending: 'Pending',
};
export const STATE_ICON: Record<PrState, IconName> = {
  success: 'checkCircle',
  error: 'xCircle',
  warning: 'alert',
  blocked: 'ban',
  pending: 'pending',
};

export const PR_STATUS_TEXT: Record<PullRequestStatus, string> = {
  open: 'Open',
  draft: 'Draft',
  blocked: 'Blocked',
  'changes-requested': 'Changes requested',
};

export const ISSUE_ICON: Record<IssueKind, IconName> = {
  deploy: 'rocket',
  actions: 'play',
  bug: 'bug',
  issue: 'dot',
  security: 'shield',
};

export const COLUMNS: { id: TaskColumn; label: string; short: string }[] = [
  { id: 'todo', label: 'To do', short: 'To do' },
  { id: 'doing', label: 'In progress', short: 'Doing' },
  { id: 'review', label: 'Review', short: 'Review' },
  { id: 'done', label: 'Done', short: 'Done' },
];

/** Icon of an attention row, from what it points at. */
export function attentionIcon(item: AttentionItem, issueKind?: IssueKind): IconName {
  switch (item.ref.resource) {
    case 'emails':
      return 'mail';
    case 'issues':
      return issueKind ? ISSUE_ICON[issueKind] : 'alert';
    case 'pulls':
      return 'pr';
    case 'reminders':
      return 'checkSquare';
    case 'gantt':
      return 'gantt';
    case 'events':
      return 'calendar';
    default:
      return 'dot';
  }
}

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  pending: 'Queued',
  claimed: 'Agent working',
  awaiting_approval: 'Needs your review',
  approved: 'Approved',
  executing: 'Carrying out',
  done: 'Done',
  failed: 'Failed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

/** Signal colour of a job status (st-* utilities, already in the safelist). */
export const JOB_STATUS_CLASS: Record<JobStatus, string> = {
  pending: 'st-pending',
  claimed: 'st-pending',
  awaiting_approval: 'st-warning',
  approved: 'st-pending',
  executing: 'st-pending',
  done: 'st-success',
  failed: 'st-error',
  rejected: 'st-done',
  cancelled: 'st-done',
};

export const JOB_KIND_LABEL: Record<JobKind, string> = {
  'task.do': 'Trello card',
  'email.reply': 'Email reply',
  record: 'Request',
  free: 'Request',
};

/** A record of each resource, in words: "the email", "the card"… */
export const RESOURCE_NOUN: Record<Resource, string> = {
  emails: 'email',
  events: 'event',
  pulls: 'pull request',
  issues: 'issue',
  reminders: 'reminder',
  tasks: 'card',
  projects: 'project',
  gantt: 'Gantt task',
};
