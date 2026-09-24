import type { Priority } from '../schemas/common';
import type { EmailInput } from '../schemas/email';
import type { GanttTask } from '../schemas/gantt-task';
import type { PullRequest } from '../schemas/pull-request';
import type { Reminder } from '../schemas/reminder';
import { addDays, clamp, daysBetween, dayDiff, HOUR, ms, startOfDay } from './dates';

export const LEVEL_RANK: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3, normal: 4 };
export const byLevel = (a: Priority, b: Priority): number => LEVEL_RANK[a] - LEVEL_RANK[b];

/* mail ------------------------------------------------------------------ */
const MAIL_ACTION = new Set(['urgent', 'needs-reply']);
export const needsAction = (e: Pick<EmailInput, 'done' | 'category'>): boolean =>
  !e.done && MAIL_ACTION.has(e.category);

/* reminders ------------------------------------------------------------- */
export type ReminderState = 'done' | 'overdue' | 'today' | 'upcoming';
export function reminderState(r: Pick<Reminder, 'done' | 'due' | 'hasTime'>, now: Date): ReminderState {
  if (r.done) return 'done';
  const d = dayDiff(r.due, now);
  if (d < 0 || (r.hasTime && ms(r.due) < now.getTime())) return 'overdue';
  return d === 0 ? 'today' : 'upcoming';
}

/* pull requests --------------------------------------------------------- */
export type PrState = 'blocked' | 'error' | 'pending' | 'warning' | 'success';
export function prState(p: Pick<PullRequest, 'status' | 'checks'>): PrState {
  if (p.status === 'blocked') return 'blocked';
  if (p.checks.failed > 0) return 'error';
  if (p.checks.pending > 0) return 'pending';
  if (p.status === 'changes-requested') return 'warning';
  return 'success';
}

export function prLevel(
  p: Pick<PullRequest, 'reviewRequested' | 'priority' | 'createdAt' | 'checks'>,
  now: Date,
): Priority {
  const ageH = (now.getTime() - ms(p.createdAt)) / HOUR;
  if (p.reviewRequested && (p.priority === 'high' || ageH > 72)) return 'high';
  if (p.reviewRequested || p.checks.failed > 0) return 'medium';
  return 'low';
}

/* gantt ----------------------------------------------------------------- */
export type GanttStatus = 'done' | 'on-track' | 'at-risk' | 'delayed' | 'not-started';
export const STATUS_RANK: Record<GanttStatus, number> = {
  delayed: 0,
  'at-risk': 1,
  'on-track': 2,
  'not-started': 3,
  done: 4,
};

/** Status from dates and progress: at risk when more than 15 points behind the linear plan. */
export function ganttStatus(t: Pick<GanttTask, 'progress' | 'start' | 'end'>, now: Date): GanttStatus {
  const n = now.getTime();
  const start = ms(t.start);
  const end = ms(t.end);
  if (t.progress >= 100) return 'done';
  if (end < startOfDay(now).getTime()) return 'delayed';
  if (start > n && t.progress === 0) return 'not-started';
  const expected = clamp((n - start) / (end - start || 1), 0, 1) * 100;
  return t.progress < expected - 15 ? 'at-risk' : 'on-track';
}

type Schedulable = Pick<GanttTask, 'key' | 'start' | 'end' | 'dependsOn'>;

/** Dependencies whose successor starts on or before the predecessor's last day, as `successor<predecessor`. */
export function depConflicts(tasks: Schedulable[]): string[] {
  const byKey = new Map(tasks.map((t) => [t.key, t]));
  const out: string[] = [];
  for (const t of tasks)
    for (const d of t.dependsOn) {
      const p = byKey.get(d);
      if (p && startOfDay(t.start) <= startOfDay(p.end)) out.push(`${t.key}<${d}`);
    }
  return out;
}

/**
 * Push every task that starts before its predecessor ends to the day after, keeping
 * its duration in days. Returns only the tasks that moved, with their new dates.
 */
export function rescheduleByDependencies(tasks: Schedulable[]): { key: string; start: string; end: string }[] {
  const work = new Map(tasks.map((t) => [t.key, { ...t, start: ms(t.start), end: ms(t.end) }]));
  const moved = new Set<string>();
  for (let pass = 0; pass < work.size; pass++) {
    let changed = false;
    for (const t of work.values())
      for (const d of t.dependsOn) {
        const p = work.get(d);
        if (!p) continue;
        const min = addDays(startOfDay(p.end), 1);
        if (startOfDay(t.start) < min) {
          const dur = daysBetween(t.start, t.end);
          t.start = min.getTime();
          t.end = addDays(min, dur).getTime();
          moved.add(t.key);
          changed = true;
        }
      }
    if (!changed) break;
  }
  return [...moved].map((key) => {
    const t = work.get(key)!;
    return { key, start: new Date(t.start).toISOString(), end: new Date(t.end).toISOString() };
  });
}
