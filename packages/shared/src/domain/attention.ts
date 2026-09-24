import type { Priority, Resource } from '../schemas/common';
import { DAY, ms } from './dates';
import { byLevel, ganttStatus, needsAction, prLevel, reminderState } from './status';
import type { DashboardData } from './types';

export type AttentionLevel = Priority | 'upcoming';
export type AttentionReason =
  | 'mail-action'
  | 'issue'
  | 'review-requested'
  | 'reminder-overdue'
  | 'reminder-today'
  | 'gantt-delayed'
  | 'gantt-at-risk'
  | 'event-soon'
  | 'reminder-soon';

/**
 * One row of "Resolve first" / "Coming up". Carries no display text beyond the
 * record's own title and context: the frontend words it from `reason` and `when`.
 */
export interface AttentionItem {
  key: string;
  level: AttentionLevel;
  reason: AttentionReason;
  source: 'Mail' | 'GitHub' | 'Reminder' | 'Plan' | 'Calendar';
  ref: { resource: Resource; id: string };
  title: string;
  context: string;
  /** due: a deadline/start to count down to; ago: when it arrived; status: an end date already passed or at risk. */
  when: { at: string; mode: 'due' | 'ago' | 'status'; hasTime: boolean };
  progress?: number;
}

const byLevelThenTime = (a: AttentionItem, b: AttentionItem) =>
  byLevel(a.level as Priority, b.level as Priority) || ms(a.when.at) - ms(b.when.at);

/**
 * The attention engine: every source contributes items with a level. Everything
 * in "Resolve first", the counters and the notification bell comes from here.
 */
export function attentionItems(s: DashboardData, now: Date): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const e of s.emails)
    if (needsAction(e))
      items.push({
        key: `mail:${e.id}`,
        level: e.priority === 'normal' ? 'low' : e.priority,
        reason: 'mail-action',
        source: 'Mail',
        ref: { resource: 'emails', id: e.id },
        title: e.subject,
        context: [e.from.name, e.from.org].filter(Boolean).join(', '),
        when: e.deadline
          ? { at: e.deadline, mode: 'due', hasTime: true }
          : { at: e.receivedAt, mode: 'ago', hasTime: true },
      });

  for (const i of s.issues)
    if (!i.acknowledged && i.state !== 'success' && i.level !== 'low')
      items.push({
        key: `issue:${i.id}`,
        level: i.level,
        reason: 'issue',
        source: 'GitHub',
        ref: { resource: 'issues', id: i.id },
        title: i.title,
        context: i.repo,
        when: { at: i.createdAt, mode: 'ago', hasTime: true },
      });

  for (const p of s.pulls)
    if (p.reviewRequested)
      items.push({
        key: `pr:${p.id}`,
        level: prLevel(p, now),
        reason: 'review-requested',
        source: 'GitHub',
        ref: { resource: 'pulls', id: p.id },
        title: p.title,
        context: `${p.repo}#${p.number}`,
        when: { at: p.createdAt, mode: 'ago', hasTime: true },
      });

  for (const r of s.reminders) {
    const st = reminderState(r, now);
    if (st !== 'overdue' && st !== 'today') continue;
    items.push({
      key: `rem:${r.id}`,
      level: st === 'overdue' || r.priority === 'high' ? 'high' : 'medium',
      reason: st === 'overdue' ? 'reminder-overdue' : 'reminder-today',
      source: 'Reminder',
      ref: { resource: 'reminders', id: r.id },
      title: r.title,
      context: r.category,
      when: { at: r.due, mode: 'due', hasTime: r.hasTime },
    });
  }

  const projectName = new Map(s.projects.map((p) => [p.key, p.name]));
  for (const t of s.gantt) {
    const st = ganttStatus(t, now);
    if (st !== 'delayed' && st !== 'at-risk') continue;
    items.push({
      key: `gantt:${t.id}`,
      level: st === 'delayed' ? 'high' : 'medium',
      reason: st === 'delayed' ? 'gantt-delayed' : 'gantt-at-risk',
      source: 'Plan',
      ref: { resource: 'gantt', id: t.id },
      title: t.title,
      context: projectName.get(t.projectKey) ?? t.projectKey,
      when: { at: t.end, mode: 'status', hasTime: false },
      progress: t.progress,
    });
  }

  return items.sort(byLevelThenTime);
}

/** What arrives in the next 48h and doesn't need action yet. */
export function upcomingItems(s: DashboardData, now: Date): AttentionItem[] {
  const n = now.getTime();
  const horizon = n + 2 * DAY;
  const events: AttentionItem[] = s.events
    .filter((e) => ms(e.start) > n && ms(e.start) < horizon)
    .map((e) => ({
      key: `ev:${e.id}`,
      level: 'upcoming',
      reason: 'event-soon',
      source: 'Calendar',
      ref: { resource: 'events', id: e.id },
      title: e.title,
      context: e.location || e.videoLink || e.category,
      when: { at: e.start, mode: 'due', hasTime: true },
    }));
  const reminders: AttentionItem[] = s.reminders
    .filter((r) => reminderState(r, now) === 'upcoming' && ms(r.due) < horizon)
    .map((r) => ({
      key: `rem:${r.id}`,
      level: 'upcoming',
      reason: 'reminder-soon',
      source: 'Reminder',
      ref: { resource: 'reminders', id: r.id },
      title: r.title,
      context: r.category,
      when: { at: r.due, mode: 'due', hasTime: r.hasTime },
    }));
  return [...events, ...reminders].sort((a, b) => ms(a.when.at) - ms(b.when.at));
}
