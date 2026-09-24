import type { Priority } from '../schemas/common';
import { DAY, ms } from './dates';
import type { ProjectSummary } from './projects';
import { ganttStatus, needsAction, reminderState } from './status';
import type { DashboardData } from './types';

export type KpiId = 'tasks' | 'mail' | 'prs' | 'meet' | 'overdue' | 'proj';

export interface Kpi {
  id: KpiId;
  value: number;
  /** Colour hint; null when the number is informational. */
  level: Priority | null;
  /** Dashboard section the tile links to. */
  target: 'reminders' | 'mail' | 'github' | 'calendar' | 'projects';
}

export function kpis(s: DashboardData, projects: ProjectSummary[], now: Date): Kpi[] {
  const n = now.getTime();
  const remindersToday = s.reminders.filter((r) => reminderState(r, now) === 'today').length;
  const overdue =
    s.reminders.filter((r) => reminderState(r, now) === 'overdue').length +
    s.gantt.filter((t) => ganttStatus(t, now) === 'delayed').length;
  const mail = s.emails.filter(needsAction);
  const prs = s.pulls.filter((p) => p.reviewRequested).length;
  const meetings = s.events.filter(
    (e) => e.category === 'meeting' && ms(e.end) > n && ms(e.start) < n + DAY,
  ).length;
  const active = projects.filter((p) => p.progress < 100).length;

  return [
    { id: 'tasks', value: remindersToday, target: 'reminders', level: remindersToday ? 'medium' : null },
    {
      id: 'mail',
      value: mail.length,
      target: 'mail',
      level: mail.some((e) => e.priority === 'critical') ? 'critical' : mail.length ? 'medium' : null,
    },
    { id: 'prs', value: prs, target: 'github', level: prs ? 'medium' : null },
    { id: 'meet', value: meetings, target: 'calendar', level: null },
    { id: 'overdue', value: overdue, target: 'reminders', level: overdue ? 'high' : null },
    { id: 'proj', value: active, target: 'projects', level: null },
  ];
}
