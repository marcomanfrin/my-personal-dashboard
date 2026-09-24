/**
 * Calendar-day arithmetic in the process local time zone (set TZ on the server
 * to the dashboard owner's zone). Inputs accept Date or ISO string.
 */
export const MIN = 60_000;
export const HOUR = 3_600_000;
export const DAY = 86_400_000;

export type DateLike = Date | string | number;

export const toDate = (d: DateLike): Date => (d instanceof Date ? d : new Date(d));
export const ms = (d: DateLike): number => toDate(d).getTime();

export function startOfDay(d: DateLike): Date {
  const x = new Date(ms(d));
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: DateLike, n: number): Date {
  const x = new Date(ms(d));
  x.setDate(x.getDate() + n);
  return x;
}

/** Whole calendar days from `a` to `b` (DST safe). */
export const daysBetween = (a: DateLike, b: DateLike): number =>
  Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY);

/** Calendar days from `ref` to `d`: 0 today, -1 yesterday, 1 tomorrow. */
export const dayDiff = (d: DateLike, ref: DateLike): number => daysBetween(ref, d);

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
