import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePreference } from '../hooks/usePreference';

const COLLAPSED_KEY = 'cc-collapsed';
const FLASH_MS = 1400;
/** The spy ignores scrolling after a nav click until the page has been still this long. */
const SCROLL_IDLE_MS = 160;
/** Fraction of the viewport below the topbar where a section counts as "being read". */
const READING_LINE = 0.3;
const BOTTOM_SLACK_PX = 4;
/** Widgets side by side in the grid share a row even if their tops differ by a pixel or two. */
const ROW_TOLERANCE_PX = 8;
const NONE_COLLAPSED: Record<string, boolean> = {};

interface SectionsState {
  collapsed: Record<string, boolean>;
  toggle(id: string): void;
  /** Collapses (or expands) all the given sections at once. */
  setAll(ids: readonly string[], collapsed: boolean): void;
  /** Scrolls to a section, expanding and briefly highlighting it. */
  goTo(id: string): void;
  active: string;
  /** Rendered sections in reading order (rows top to bottom, left to right): the dense grid can differ from the saved order. */
  order: readonly string[];
  flashing: string | null;
  register(id: string, el: HTMLElement | null): void;
}

const Ctx = createContext<SectionsState | null>(null);

/** Reading order of boxes laid out in rows: top to bottom, then left to right within a row. */
export function readingOrder(boxes: { id: string; top: number; left: number }[]): string[] {
  const byTop = [...boxes].sort((a, b) => a.top - b.top);
  const rows: (typeof boxes)[] = [];
  for (const b of byTop) {
    const row = rows.at(-1);
    if (row && b.top - row[0]!.top <= ROW_TOLERANCE_PX) row.push(b);
    else rows.push([b]);
  }
  return rows.flatMap((row) => row.sort((a, b) => a.left - b.left).map((b) => b.id));
}

const sameOrder = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Collapsed cards (a user preference), section navigation and the scroll spy for the nav highlight. */
export function SectionsProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = usePreference('collapsed', COLLAPSED_KEY, NONE_COLLAPSED);
  const [active, setActive] = useState('overview');
  const [flashing, setFlashing] = useState<string | null>(null);
  const [order, setOrder] = useState<readonly string[]>([]);
  const elements = useRef(new Map<string, HTMLElement>());
  const activeRef = useRef(active);
  activeRef.current = active;
  /** While a nav click scrolls, the spy stays quiet so it does not flicker through the sections passed. */
  const navigating = useRef(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const scheduleOrder = useRef<() => void>(() => {});

  const releaseWhenIdle = useCallback(() => {
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => (navigating.current = false), SCROLL_IDLE_MS);
  }, []);

  // Scroll spy on live positions: the active section is the last row whose top has
  // passed the reading line below the topbar (at the very bottom of the page, the
  // last row that shows). Side-by-side widgets share a row: the current one wins,
  // otherwise the leftmost.
  useEffect(() => {
    let frame = 0;
    let orderFrame = 0;
    const measureOrder = () => {
      orderFrame = 0;
      const next = readingOrder(
        [...elements.current]
          .map(([id, el]) => ({ id, rect: el.getBoundingClientRect() }))
          .filter((r) => r.rect.height > 0)
          .map(({ id, rect }) => ({ id, top: rect.top, left: rect.left })),
      );
      setOrder((prev) => (sameOrder(prev, next) ? prev : next));
    };
    scheduleOrder.current = () => {
      if (!orderFrame) orderFrame = requestAnimationFrame(measureOrder);
    };
    const measure = () => {
      frame = 0;
      if (navigating.current || !elements.current.size) return;
      const pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      const line = pad + (window.innerHeight - pad) * READING_LINE;
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - BOTTOM_SLACK_PX;
      const rects = [...elements.current].map(([id, el]) => ({ id, rect: el.getBoundingClientRect() }));
      const limit = atBottom ? window.innerHeight : line;
      const passed = rects.filter((r) => r.rect.top <= limit && r.rect.height > 0);
      if (!passed.length) {
        const first = rects.sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left)[0];
        if (first) setActive(first.id);
        return;
      }
      const rowTop = Math.max(...passed.map((r) => r.rect.top));
      const row = passed.filter((r) => r.rect.top >= rowTop - ROW_TOLERANCE_PX);
      const next =
        row.find((r) => r.id === activeRef.current) ?? row.sort((a, b) => a.rect.left - b.rect.left)[0]!;
      setActive(next.id);
    };
    const schedule = () => {
      if (navigating.current) releaseWhenIdle();
      else if (!frame) frame = requestAnimationFrame(measure);
    };
    window.addEventListener('scroll', schedule, { passive: true });
    // Collapsing or expanding a card moves the others without scrolling.
    const onLayout = () => {
      schedule();
      scheduleOrder.current();
    };
    window.addEventListener('resize', onLayout);
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(onLayout);
    resize?.observe(document.body);
    onLayout();
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', onLayout);
      resize?.disconnect();
      cancelAnimationFrame(frame);
      cancelAnimationFrame(orderFrame);
      clearTimeout(idleTimer.current);
    };
  }, [releaseWhenIdle]);

  const register = useCallback((id: string, el: HTMLElement | null) => {
    if (el) elements.current.set(id, el);
    else elements.current.delete(id);
    // Widgets moved or shown again: the navigation follows the new layout.
    scheduleOrder.current();
  }, []);

  const toggle = useCallback((id: string) => setCollapsed((c) => ({ ...c, [id]: !c[id] })), []);
  const setAll = useCallback(
    (ids: readonly string[], value: boolean) =>
      setCollapsed((c) => ({ ...c, ...Object.fromEntries(ids.map((id) => [id, value])) })),
    [],
  );

  const goTo = useCallback((id: string) => {
    setCollapsed((c) => (c[id] ? { ...c, [id]: false } : c));
    setActive(id);
    navigating.current = true;
    releaseWhenIdle();
    // Let an expanded card render before measuring.
    requestAnimationFrame(() => {
      const section = document.getElementById(id);
      section?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
      // Move focus too, so the next Tab continues inside the section instead of the nav.
      section?.querySelector<HTMLElement>('h2[tabindex]')?.focus({ preventScroll: true });
    });
    clearTimeout(flashTimer.current);
    setFlashing(id);
    flashTimer.current = setTimeout(() => setFlashing(null), FLASH_MS);
  }, [releaseWhenIdle]);

  const value = useMemo(
    () => ({ collapsed, toggle, setAll, goTo, active, order, flashing, register }),
    [collapsed, toggle, setAll, goTo, active, order, flashing, register],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSections(): SectionsState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSections outside SectionsProvider');
  return ctx;
}

/** Wiring for one section element. */
export function useSection(id: string) {
  const s = useSections();
  const { register } = s;
  const ref = useCallback((el: HTMLElement | null) => register(id, el), [register, id]);
  return { collapsed: !!s.collapsed[id], toggle: () => s.toggle(id), flashing: s.flashing === id, ref };
}
