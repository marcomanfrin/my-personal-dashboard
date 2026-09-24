import type { DashboardData, Resource } from '@argus/shared';
import type { IconName } from '../components/ui/icons';
import { dueText, relPast } from './format';
import { COLUMNS, ISSUE_ICON } from './labels';

export interface SearchResult {
  group: string;
  icon: IconName;
  resource: Resource;
  id: string;
  title: string;
  sub: string;
  text: string;
}

function index(d: DashboardData, now: Date): SearchResult[] {
  const projectName = new Map(d.projects.map((p) => [p.key, p.name]));
  return [
    ...d.emails.map((e) => ({
      group: 'Mail',
      icon: 'mail' as const,
      resource: 'emails' as const,
      id: e.id,
      title: e.subject,
      sub: `${e.from.name}, ${relPast(e.receivedAt, now)}`,
      text: `${e.subject} ${e.from.name} ${e.from.org} ${e.preview}`,
    })),
    ...d.events.map((e) => ({
      group: 'Calendar',
      icon: 'calendar' as const,
      resource: 'events' as const,
      id: e.id,
      title: e.title,
      sub: dueText(e.start, true, now),
      text: `${e.title} ${e.location ?? ''} ${e.attendees.join(' ')}`,
    })),
    ...d.pulls.map((p) => ({
      group: 'Pull requests',
      icon: 'pr' as const,
      resource: 'pulls' as const,
      id: p.id,
      title: p.title,
      sub: `${p.repo} #${p.number}`,
      text: `${p.title} ${p.repo} ${p.number} ${p.author}`,
    })),
    ...d.issues.map((i) => ({
      group: 'Errors & issues',
      icon: ISSUE_ICON[i.kind],
      resource: 'issues' as const,
      id: i.id,
      title: i.title,
      sub: i.repo,
      text: `${i.title} ${i.repo} ${i.detail}`,
    })),
    ...d.reminders.map((r) => ({
      group: 'Reminders',
      icon: 'checkSquare' as const,
      resource: 'reminders' as const,
      id: r.id,
      title: r.title,
      sub: dueText(r.due, r.hasTime, now),
      text: `${r.title} ${r.category}`,
    })),
    ...d.tasks.map((t) => ({
      group: 'Trello',
      icon: 'kanban' as const,
      resource: 'tasks' as const,
      id: t.id,
      title: t.title,
      sub: `${t.board}, ${COLUMNS.find((c) => c.id === t.column)!.label}`,
      text: `${t.title} ${t.board} ${t.labels.join(' ')}`,
    })),
    ...d.gantt.map((t) => ({
      group: 'Plan',
      icon: 'gantt' as const,
      resource: 'gantt' as const,
      id: t.id,
      title: `${t.key} ${t.title}`,
      sub: projectName.get(t.projectKey) ?? t.projectKey,
      text: `${t.key} ${t.title} ${t.tags.join(' ')} ${projectName.get(t.projectKey) ?? ''}`,
    })),
  ];
}

/** Every term must appear somewhere in the item; first 10 matches, grouped by source. */
export function search(d: DashboardData, now: Date, query: string, limit = 10): SearchResult[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return index(d, now)
    .filter((x) => {
      const hay = x.text.toLowerCase();
      return terms.every((t) => hay.includes(t));
    })
    .slice(0, limit);
}
