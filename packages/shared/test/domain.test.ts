import { describe, expect, it } from 'vitest';
import {
  attentionItems,
  buildInsights,
  depConflicts,
  ganttStatus,
  POSITION_STEP,
  positionAt,
  positionBetween,
  prLevel,
  prState,
  reminderState,
  rescheduleByDependencies,
  sortByPosition,
  upcomingItems,
  type DashboardData,
  type Email,
  type GanttTask,
  type Reminder,
} from '../src';

const NOW = new Date(2026, 8, 24, 10, 0); // Thu 24 Sep 2026, 10:00 local
const at = (days: number, h = 0, m = 0) => new Date(2026, 8, 24 + days, h, m).toISOString();
const meta = (id: string) => ({ id, externalId: id, url: null, agentId: null, syncedAt: null, updatedAt: at(0) });

const reminder = (over: Partial<Reminder>): Reminder => ({
  ...meta('r'),
  title: 'r',
  due: at(0, 23, 59),
  hasTime: false,
  priority: 'medium',
  category: 'Work',
  done: false,
  ...over,
});

const gantt = (over: Partial<GanttTask>): GanttTask => ({
  ...meta(over.key ?? 'g'),
  projectKey: 'HMI',
  key: 'HMI-1',
  tags: [],
  title: 't',
  assignee: 'Marco',
  start: at(-5),
  end: at(5),
  deadline: null,
  progress: 50,
  dependsOn: [],
  ...over,
});

const email = (over: Partial<Email>): Email => ({
  ...meta('m'),
  from: { name: 'Luca', org: 'Sistec', address: 'l@x' },
  subject: 's',
  preview: '',
  body: '',
  receivedAt: at(0, 9),
  category: 'urgent',
  priority: 'critical',
  attachments: [],
  deadline: null,
  read: false,
  done: false,
  ...over,
});

const empty: DashboardData = {
  emails: [],
  events: [],
  pulls: [],
  issues: [],
  reminders: [],
  tasks: [],
  projects: [],
  gantt: [],
};

describe('reminderState', () => {
  it('classifies by calendar day and time', () => {
    expect(reminderState(reminder({ due: at(-1, 23, 59) }), NOW)).toBe('overdue');
    expect(reminderState(reminder({ due: at(0, 9), hasTime: true }), NOW)).toBe('overdue');
    expect(reminderState(reminder({ due: at(0, 17), hasTime: true }), NOW)).toBe('today');
    expect(reminderState(reminder({ due: at(1) }), NOW)).toBe('upcoming');
    expect(reminderState(reminder({ due: at(-3), done: true }), NOW)).toBe('done');
  });
});

describe('ganttStatus', () => {
  it('derives status from dates and progress', () => {
    expect(ganttStatus(gantt({ progress: 100 }), NOW)).toBe('done');
    expect(ganttStatus(gantt({ start: at(-9), end: at(-1), progress: 60 }), NOW)).toBe('delayed');
    expect(ganttStatus(gantt({ start: at(3), end: at(10), progress: 0 }), NOW)).toBe('not-started');
    expect(ganttStatus(gantt({ start: at(-6), end: at(9), progress: 30 }), NOW)).toBe('on-track');
    expect(ganttStatus(gantt({ start: at(-10), end: at(2), progress: 20 }), NOW)).toBe('at-risk');
  });
});

describe('pull requests', () => {
  const pr = {
    status: 'open' as const,
    checks: { total: 3, passed: 3, failed: 0, pending: 0, failedNames: [] },
    reviewRequested: true,
    priority: 'medium' as const,
    createdAt: at(0, 8),
  };
  it('prState prioritises blocked, then failures, then pending', () => {
    expect(prState({ ...pr, status: 'blocked' })).toBe('blocked');
    expect(prState({ ...pr, checks: { ...pr.checks, failed: 1 } })).toBe('error');
    expect(prState({ ...pr, checks: { ...pr.checks, pending: 1 } })).toBe('pending');
    expect(prState(pr)).toBe('success');
  });
  it('prLevel escalates old or high-priority review requests', () => {
    expect(prLevel(pr, NOW)).toBe('medium');
    expect(prLevel({ ...pr, priority: 'high' }, NOW)).toBe('high');
    expect(prLevel({ ...pr, createdAt: at(-4) }, NOW)).toBe('high');
    expect(prLevel({ ...pr, reviewRequested: false }, NOW)).toBe('low');
  });
});

describe('dependencies', () => {
  const a = gantt({ key: 'A', start: at(-5), end: at(6) });
  const b = gantt({ key: 'B', start: at(2), end: at(8), dependsOn: ['A'] });
  const c = gantt({ key: 'C', start: at(7), end: at(9), dependsOn: ['B'] });

  it('detects successors starting before the predecessor ends', () => {
    expect(depConflicts([a, b, c])).toEqual(['B<A', 'C<B']);
  });

  it('reschedules transitively and keeps durations', () => {
    const moved = rescheduleByDependencies([a, b, c]);
    const byKey = Object.fromEntries(moved.map((m) => [m.key, m]));
    expect(Object.keys(byKey).sort()).toEqual(['B', 'C']);
    expect(new Date(byKey.B!.start).getDate()).toBe(new Date(at(7)).getDate());
    expect(new Date(byKey.B!.end).getDate()).toBe(new Date(at(13)).getDate());
    expect(new Date(byKey.C!.start).getDate()).toBe(new Date(at(14)).getDate());
  });
});

describe('attention engine', () => {
  it('orders by level then time and skips handled items', () => {
    const data: DashboardData = {
      ...empty,
      emails: [
        email({ id: 'm1', priority: 'medium', category: 'needs-reply' }),
        email({ id: 'm2', priority: 'critical' }),
        email({ id: 'm3', done: true }),
        email({ id: 'm4', category: 'fyi' }),
      ],
      reminders: [reminder({ id: 'r1', due: at(-1) })],
    };
    const items = attentionItems(data, NOW);
    expect(items.map((i) => i.key)).toEqual(['mail:m2', 'rem:r1', 'mail:m1']);
    expect(items[1]!.reason).toBe('reminder-overdue');
  });

  it('lists the next 48h in upcoming', () => {
    const data: DashboardData = {
      ...empty,
      events: [
        { ...meta('e1'), title: 'soon', start: at(0, 14), end: at(0, 15), category: 'meeting', location: 'Room', videoLink: null, important: false, attendees: [], notes: null },
        { ...meta('e2'), title: 'far', start: at(5, 9), end: at(5, 10), category: 'meeting', location: null, videoLink: null, important: false, attendees: [], notes: null },
      ],
      reminders: [reminder({ id: 'r2', due: at(1) })],
    };
    expect(upcomingItems(data, NOW).map((i) => i.key)).toEqual(['ev:e1', 'rem:r2']);
  });

  it('builds kpis and project summaries', () => {
    const data: DashboardData = {
      ...empty,
      emails: [email({})],
      projects: [{ ...meta('p1'), key: 'HMI', name: 'HMI 5309', area: 'Sistec', owner: 'Luca' }],
      gantt: [gantt({ key: 'HMI-1', progress: 100 }), gantt({ key: 'HMI-2', start: at(-9), end: at(-1), progress: 60 })],
    };
    const out = buildInsights(data, NOW);
    expect(out.kpis.find((k) => k.id === 'mail')).toMatchObject({ value: 1, level: 'critical' });
    expect(out.kpis.find((k) => k.id === 'overdue')).toMatchObject({ value: 1, level: 'high' });
    expect(out.projects[0]).toMatchObject({ key: 'HMI', health: 'delayed', openTasks: 1 });
  });
});

describe('kanban positions', () => {
  const col = (...ps: (number | null)[]) => ps.map((position, i) => ({ id: `c${i}`, position }));

  it('sorts by position, unpositioned cards last in their incoming order', () => {
    expect(sortByPosition(col(3, null, 1, null, 2)).map((c) => c.id)).toEqual(['c2', 'c4', 'c0', 'c1', 'c3']);
  });

  it('places a card between, above or below its neighbours', () => {
    expect(positionBetween(100, 200)).toBe(150);
    expect(positionBetween(100, null)).toBe(100 + POSITION_STEP);
    expect(positionBetween(null, 100)).toBe(50);
    expect(positionBetween()).toBe(POSITION_STEP);
  });

  it('inserts at an index of the shown column, staying positive and ordered', () => {
    const c = col(100, 200, 300);
    expect(positionAt(c, 0)).toBe(50);
    expect(positionAt(c, 1)).toBe(150);
    expect(positionAt(c, 3)).toBe(300 + POSITION_STEP);
    expect(positionAt([], 0)).toBe(POSITION_STEP);
    // Unpositioned neighbours are skipped over.
    expect(positionAt(col(100, null, 300), 2)).toBe(200);
  });
});
