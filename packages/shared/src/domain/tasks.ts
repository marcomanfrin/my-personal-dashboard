import type { Task } from '../schemas';

/** Gap between consecutive positions when appending, the same step Trello uses. */
export const POSITION_STEP = 65536;

type Positioned = Pick<Task, 'position'>;

/**
 * Column order: by `position` ascending; cards without one (not yet synced with a
 * position) keep their incoming order after the positioned ones.
 */
export function sortByPosition<T extends Positioned>(tasks: readonly T[]): T[] {
  return tasks
    .map((t, i) => ({ t, i }))
    .sort((a, b) => {
      const pa = a.t.position ?? Infinity;
      const pb = b.t.position ?? Infinity;
      return pa === pb ? a.i - b.i : pa - pb;
    })
    .map((x) => x.t);
}

/**
 * The position that puts a card between `before` and `after` (either may be
 * missing: top or bottom of the column). Always positive, like Trello's `pos`.
 */
export function positionBetween(before?: number | null, after?: number | null): number {
  if (before != null && after != null) return (before + after) / 2;
  if (before != null) return before + POSITION_STEP;
  if (after != null) return after / 2;
  return POSITION_STEP;
}

/**
 * Where a card lands when inserted at `index` of `column` (the column as shown,
 * sorted, without the moving card). Unpositioned neighbours are skipped over.
 */
export function positionAt(column: readonly Positioned[], index: number): number {
  const before = column
    .slice(0, index)
    .map((t) => t.position)
    .filter((p): p is number => p != null)
    .at(-1);
  const after = column
    .slice(index)
    .map((t) => t.position)
    .find((p): p is number => p != null);
  return positionBetween(before, after);
}
