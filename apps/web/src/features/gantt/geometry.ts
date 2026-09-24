import { addDays, daysBetween, DAY, ms, startOfDay, type GanttTask } from '@argus/shared';

export type Zoom = 'week' | 'month' | 'quarter';
/** Pixels per day at each zoom. */
export const ZOOMS: Record<Zoom, { label: string; dw: number }> = {
  week: { label: 'Week', dw: 104 },
  month: { label: 'Month', dw: 40 },
  quarter: { label: 'Quarter', dw: 18 },
};

/** Row height, bar height, gap between project groups, top/bottom padding (px). */
export const GL = { ROW: 56, BAR: 40, GAP: 24, PAD: 16 };

type Span = Pick<GanttTask, 'start' | 'end' | 'deadline'>;

export function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  return Math.ceil(((t.getTime() - Date.UTC(t.getUTCFullYear(), 0, 1)) / DAY + 1) / 7);
}

/** Whole weeks (Mon to Sun) around every task and today, with some air on both sides. */
export function ganttRange(tasks: Span[], now: Date): { start: Date; days: number } {
  const t0 = startOfDay(now).getTime();
  let start = addDays(startOfDay(Math.min(t0, ...tasks.map((t) => ms(t.start)))), -3);
  while (start.getDay() !== 1) start = addDays(start, -1);
  let end = addDays(
    startOfDay(Math.max(t0, ...tasks.map((t) => ms(t.end)), ...tasks.map((t) => ms(t.deadline ?? t.end)))),
    4,
  );
  while (end.getDay() !== 0) end = addDays(end, 1);
  return { start, days: daysBetween(start, end) + 1 };
}

/** Linear window for the compact list view: percentage position of a date. */
export function ganttWindow(tasks: Span[], now: Date) {
  const t0 = startOfDay(now).getTime();
  const min = Math.min(t0, ...tasks.map((t) => ms(t.start)));
  const max = Math.max(t0 + DAY, ...tasks.map((t) => ms(t.deadline ?? t.end)), ...tasks.map((t) => ms(t.end)));
  const start = startOfDay(min).getTime() - 2 * DAY;
  const end = startOfDay(max).getTime() + 3 * DAY;
  return { pos: (d: string | Date) => ((ms(d) - start) / (end - start)) * 100 };
}

export interface BarPos {
  x1: number;
  x2: number;
  y: number;
}

/** Rounded elbow connector from the end of `a` to the start of `b`, in px. */
export function depPath(a: BarPos, b: BarPos): string {
  const r = 10;
  const e = 8;
  const { x2: x1, y: y1 } = a;
  const { x1: x2, y: y2 } = b;
  if (y2 <= y1) return `M${x1} ${y1} H${x2}`;
  if (x2 - x1 >= 2 * (r + e)) {
    const xm = x1 + e + r;
    return `M${x1} ${y1} H${xm - r} Q${xm} ${y1} ${xm} ${y1 + r} V${y2 - r} Q${xm} ${y2} ${xm + r} ${y2} H${x2 - 3}`;
  }
  // Successor starts left of the predecessor's end: route back underneath.
  const xr = x1 + e + r;
  const xl = x2 - e - r;
  const ym = y2 - GL.ROW / 2;
  return `M${x1} ${y1} H${xr - r} Q${xr} ${y1} ${xr} ${y1 + r} V${ym - r} Q${xr} ${ym} ${xr - r} ${ym} H${xl + r} Q${xl} ${ym} ${xl} ${ym + r} V${y2 - r} Q${xl} ${y2} ${xl + r} ${y2} H${x2 - 3}`;
}

/** Scroll offset that puts today about a third into the viewport. */
export const todayScrollLeft = (todayX: number, viewport: number, dw: number) =>
  Math.max(0, todayX - Math.min(viewport * 0.3, 2.5 * dw));
