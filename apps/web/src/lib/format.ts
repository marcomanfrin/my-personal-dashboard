import { dayDiff, MIN, ms, toDate, type DateLike } from '@argus/shared';

/** UI text is English, as in the demo; times use 24h. */
export const LOCALE = 'en-US';
export const TIME_LOCALE = 'en-GB';

export const fmtTime = (d: DateLike) =>
  toDate(d).toLocaleTimeString(TIME_LOCALE, { hour: '2-digit', minute: '2-digit' });
export const fmtShort = (d: DateLike) => toDate(d).toLocaleDateString(LOCALE, { month: 'short', day: 'numeric' });
export const fmtWeekday = (d: DateLike) => toDate(d).toLocaleDateString(LOCALE, { weekday: 'short' });
export const fmtLong = (d: DateLike) =>
  toDate(d).toLocaleDateString(LOCALE, { weekday: 'long', month: 'long', day: 'numeric' });
export const fmtMonth = (d: DateLike, style: 'long' | 'short') => toDate(d).toLocaleDateString(LOCALE, { month: style });

export function fmtDuration(durationMs: number): string {
  const m = Math.round(durationMs / MIN);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

/** "12 min ago", "3h ago", "Yesterday", "4d ago", "Sep 12". */
export function relPast(d: DateLike, now: Date): string {
  const m = Math.round((now.getTime() - ms(d)) / MIN);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24 && dayDiff(d, now) === 0) return `${h}h ago`;
  const dd = -dayDiff(d, now);
  if (dd <= 1) return 'Yesterday';
  if (dd < 7) return `${dd}d ago`;
  return fmtShort(d);
}

/** Compact age: 35m, 26h, 3d. */
export function ageShort(d: DateLike, now: Date): string {
  const m = Math.round((now.getTime() - ms(d)) / MIN);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h}h` : `${Math.round(h / 24)}d`;
}

/** "In 2h 30m", "Today 17:00", "Tomorrow", "Fri 23:59", "3d overdue", "Oct 2". */
export function dueText(d: DateLike, hasTime: boolean, now: Date): string {
  const dd = dayDiff(d, now);
  const t = hasTime ? ` ${fmtTime(d)}` : '';
  if (dd < 0) return dd === -1 ? 'Yesterday' : `${-dd}d overdue`;
  if (dd === 0) {
    const mins = Math.round((ms(d) - now.getTime()) / MIN);
    if (hasTime && mins > 0 && mins < 180) return `In ${fmtDuration(mins * MIN)}`;
    return hasTime ? `Today${t}` : 'Today';
  }
  if (dd === 1) return `Tomorrow${t}`;
  if (dd < 7) return `${fmtWeekday(d)}${t}`;
  return fmtShort(d);
}

/** Stable hue for an avatar, from a name. */
export function hue(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
