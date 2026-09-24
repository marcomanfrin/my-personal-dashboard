import { useSyncExternalStore } from 'react';

/**
 * The Gantt project filter, shared with the Projects card ("Show in Gantt").
 * A tiny store rather than context: only these two widgets care.
 */
let project = 'all';
const listeners = new Set<() => void>();

export function setGanttProject(key: string): void {
  project = key;
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

export function useGanttFocus(): [string, (key: string) => void] {
  return [useSyncExternalStore(subscribe, () => project), setGanttProject];
}
