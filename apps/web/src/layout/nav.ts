import { needsAction, reminderState, type DashboardData } from '@command/shared';
import type { IconName } from '../components/ui/icons';

export interface NavItem {
  id: string;
  label: string;
  /** Label in the mobile bottom bar; items without it stay out of the bar. */
  short?: string;
  icon: IconName;
  count?: (d: DashboardData, now: Date) => number;
  /** Red badge: something critical inside. */
  hot?: (d: DashboardData) => boolean;
}

export const NAV: NavItem[] = [
  { id: 'overview', label: 'Overview', short: 'Home', icon: 'home' },
  {
    id: 'mail',
    label: 'Mail',
    short: 'Mail',
    icon: 'mail',
    count: (d) => d.emails.filter(needsAction).length,
    hot: (d) => d.emails.some((e) => needsAction(e) && e.priority === 'critical'),
  },
  { id: 'calendar', label: 'Calendar', short: 'Agenda', icon: 'calendar' },
  {
    id: 'github',
    label: 'GitHub',
    short: 'Code',
    icon: 'git',
    count: (d) =>
      d.pulls.filter((p) => p.reviewRequested).length +
      d.issues.filter((i) => !i.acknowledged && i.state === 'error').length,
    hot: (d) => d.issues.some((i) => !i.acknowledged && i.level === 'critical'),
  },
  {
    id: 'reminders',
    label: 'Reminders',
    short: 'Tasks',
    icon: 'checkSquare',
    count: (d, now) => d.reminders.filter((r) => ['overdue', 'today'].includes(reminderState(r, now))).length,
  },
  { id: 'gantt', label: 'Personal Gantt', short: 'Plan', icon: 'gantt' },
  { id: 'trello', label: 'Trello', icon: 'kanban' },
  { id: 'projects', label: 'Projects', icon: 'folder' },
];

/** The KPI tiles belong to the overview for navigation purposes. */
export const navTarget = (sectionId: string) => (sectionId === 'kpis' ? 'overview' : sectionId);
