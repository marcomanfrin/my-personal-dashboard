import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePreference } from '../hooks/usePreference';

const COLLAPSED_KEY = 'cc-collapsed';
const FLASH_MS = 1400;
const NONE_COLLAPSED: Record<string, boolean> = {};

interface SectionsState {
  collapsed: Record<string, boolean>;
  toggle(id: string): void;
  /** Collapses (or expands) all the given sections at once. */
  setAll(ids: readonly string[], collapsed: boolean): void;
  /** Scrolls to a section, expanding and briefly highlighting it. */
  goTo(id: string): void;
  active: string;
  flashing: string | null;
  register(id: string, el: HTMLElement | null): void;
}

const Ctx = createContext<SectionsState | null>(null);

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Collapsed cards (a user preference), section navigation and the scroll spy for the nav highlight. */
export function SectionsProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = usePreference('collapsed', COLLAPSED_KEY, NONE_COLLAPSED);
  const [active, setActive] = useState('overview');
  const [flashing, setFlashing] = useState<string | null>(null);
  const elements = useRef(new Map<string, HTMLElement>());
  const observer = useRef<IntersectionObserver | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined);


  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const visible = new Map<string, number | null>();
    observer.current = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.set(e.target.id, e.isIntersecting ? e.boundingClientRect.top : null);
        const best = [...visible.entries()]
          .filter((x): x is [string, number] => x[1] !== null)
          .sort((a, b) => Math.abs(a[1]) - Math.abs(b[1]))[0];
        if (best) setActive(best[0]);
      },
      { rootMargin: '-20% 0px -55% 0px' },
    );
    elements.current.forEach((el) => observer.current!.observe(el));
    return () => observer.current?.disconnect();
  }, []);

  const register = useCallback((id: string, el: HTMLElement | null) => {
    const prev = elements.current.get(id);
    if (prev && prev !== el) observer.current?.unobserve(prev);
    if (el) {
      elements.current.set(id, el);
      observer.current?.observe(el);
    } else elements.current.delete(id);
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
  }, []);

  const value = useMemo(
    () => ({ collapsed, toggle, setAll, goTo, active, flashing, register }),
    [collapsed, toggle, setAll, goTo, active, flashing, register],
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
