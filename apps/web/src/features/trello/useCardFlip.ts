import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

interface Point {
  x: number;
  y: number;
}

/** Same tilt as the `lift` keyframes, so a dropped card lands from exactly how it looked. */
const LIFTED = 'rotate(1.5deg) scale(1.03)';
const EASE = 'cubic-bezier(.2,.8,.2,1)';
const SHIFT_MS = 220;
const LAND_MS = 260;

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/**
 * FLIP for the Kanban: when cards change column (drop, Undo, a sync), every card
 * that moved glides from its old place to the new one instead of jumping. A card
 * just dropped lands from the drop point, tilted like the drag preview.
 * Positions are relative to `board`, so page scroll in between does not matter.
 *
 * @param layoutKey changes whenever a card changes column or order.
 */
export function useCardFlip(board: RefObject<HTMLElement | null>, layoutKey: string) {
  const last = useRef(new Map<string, Point>());
  const landing = useRef<{ id: string; at: Point } | null>(null);

  const measure = useCallback(() => {
    const out = new Map<string, Point>();
    const el = board.current;
    if (!el) return out;
    const base = el.getBoundingClientRect();
    for (const card of el.querySelectorAll<HTMLElement>('[data-card]')) {
      const r = card.getBoundingClientRect();
      // Cards in hidden tabs (narrow layout) have no box.
      if (r.width) out.set(card.dataset.card!, { x: r.left - base.left, y: r.top - base.top });
    }
    return out;
  }, [board]);

  /** Re-reads positions, e.g. when a drag starts or the board is resized. */
  const refresh = useCallback(() => {
    last.current = measure();
  }, [measure]);

  /** Call on drop, with the drag preview's viewport rect, before the move re-renders. */
  const landFrom = useCallback(
    (id: string, rect: { left: number; top: number }) => {
      const base = board.current?.getBoundingClientRect();
      if (base) landing.current = { id, at: { x: rect.left - base.left, y: rect.top - base.top } };
    },
    [board],
  );

  useLayoutEffect(() => {
    const prev = last.current;
    const next = measure();
    last.current = next;
    const land = landing.current;
    landing.current = null;
    if (!prev.size || prefersReducedMotion()) return;

    for (const [id, to] of next) {
      const dropped = land?.id === id;
      const from = dropped ? land.at : prev.get(id);
      if (!from) continue;
      const dx = from.x - to.x;
      const dy = from.y - to.y;
      if (!dropped && Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      const el = board.current?.querySelector<HTMLElement>(`[data-card="${id}"]`);
      if (!el) continue;

      const offset = `translate(${dx}px, ${dy}px)`;
      // The landing card flies over its neighbours.
      el.style.position = 'relative';
      el.style.zIndex = dropped ? '20' : '1';
      const anim = el.animate(
        dropped
          ? [
              { transform: `${offset} ${LIFTED}`, boxShadow: 'var(--shadow-pop)' },
              { transform: 'none', boxShadow: 'none' },
            ]
          : [{ transform: offset }, { transform: 'none' }],
        { duration: dropped ? LAND_MS : SHIFT_MS, easing: EASE },
      );
      const reset = () => {
        el.style.position = '';
        el.style.zIndex = '';
      };
      anim.onfinish = reset;
      anim.oncancel = reset;
    }
  }, [layoutKey, measure]);

  // A resize (sidebar collapse, window) moves cards without a column change: keep positions current.
  useEffect(() => {
    const el = board.current;
    if (!el || !('ResizeObserver' in window)) return;
    const ro = new ResizeObserver(() => refresh());
    ro.observe(el);
    return () => ro.disconnect();
  }, [board, refresh]);

  return { refresh, landFrom };
}

/** Drop animation back to the origin for a drag that did not move the card: it untilts on the way. */
export function untiltOnReturn(overlay: HTMLElement) {
  const face = overlay.firstElementChild as HTMLElement | null;
  face?.animate([{ transform: LIFTED, boxShadow: 'var(--shadow-pop)' }, { transform: 'none', boxShadow: 'none' }], {
    duration: SHIFT_MS,
    easing: EASE,
    fill: 'forwards',
  });
}

export const RETURN_MS = SHIFT_MS;
export const RETURN_EASE = EASE;
