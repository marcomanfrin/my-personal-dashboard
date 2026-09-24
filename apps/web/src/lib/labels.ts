import type {
  AttentionItem,
  AttentionLevel,
  EventCategory,
  GanttStatus,
  IssueKind,
  MailCategory,
  PrState,
  Priority,
  PullRequestStatus,
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
