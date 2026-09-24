import type { Resource } from '@command/shared';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { useActions } from '../hooks/useActions';
import { useSections } from '../layout/sections';

export type DrawerType = 'email' | 'event' | 'pr' | 'issue' | 'task' | 'gantt' | 'profile';
export interface DrawerTarget {
  type: DrawerType;
  id: string;
}

interface DrawerApi {
  current: DrawerTarget | null;
  /** `returnTo` gets focus back on close; defaults to the focused element. */
  open(type: DrawerType, id: string, returnTo?: HTMLElement | null): void;
  /** Opens whatever a resource record is shown with (reminders scroll to their card instead). */
  openRecord(resource: Resource, id: string, returnTo?: HTMLElement | null): void;
  close(): void;
}

const RESOURCE_DRAWER: Partial<Record<Resource, DrawerType>> = {
  emails: 'email',
  events: 'event',
  pulls: 'pr',
  issues: 'issue',
  tasks: 'task',
  gantt: 'gantt',
};

const Ctx = createContext<DrawerApi | null>(null);

const focusable = (el: HTMLElement | null | undefined): el is HTMLElement =>
  !!el && el.isConnected && el !== document.body && el.getClientRects().length > 0;

export function DrawerProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<DrawerTarget | null>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  /** The opener's card heading, for when the opener is gone on close (row marked done, menu closed). */
  const fallbackFocus = useRef<HTMLElement | null>(null);
  const { markEmailRead } = useActions();
  const { goTo } = useSections();

  const open = useCallback(
    (type: DrawerType, id: string, returnTo?: HTMLElement | null) => {
      const from = returnTo ?? (document.activeElement as HTMLElement | null);
      lastFocus.current = from;
      fallbackFocus.current = from?.closest('section')?.querySelector<HTMLElement>('h2[tabindex]') ?? null;
      if (type === 'email') markEmailRead(id);
      setCurrent({ type, id });
    },
    [markEmailRead],
  );

  const openRecord = useCallback(
    (resource: Resource, id: string, returnTo?: HTMLElement | null) => {
      const type = RESOURCE_DRAWER[resource];
      if (type) open(type, id, returnTo);
      else if (resource === 'reminders') goTo('reminders');
    },
    [open, goTo],
  );

  const close = useCallback(() => {
    setCurrent(null);
    // Give focus back to what opened the drawer, or to the nearest thing still on screen.
    requestAnimationFrame(() => {
      const target = [lastFocus.current, fallbackFocus.current, document.getElementById('main')].find(focusable);
      target?.focus();
    });
  }, []);

  const value = useMemo(() => ({ current, open, openRecord, close }), [current, open, openRecord, close]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDrawer(): DrawerApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useDrawer outside DrawerProvider');
  return ctx;
}
