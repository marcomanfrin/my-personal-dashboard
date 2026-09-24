import { useSyncExternalStore } from 'react';
import { storage } from '../lib/storage';

export type Theme = 'light' | 'dark';
const KEY = 'cc-theme';

const mq = () => window.matchMedia?.('(prefers-color-scheme: dark)');
const read = (): Theme => {
  const t = document.documentElement.getAttribute('data-theme');
  if (t === 'light' || t === 'dark') return t;
  return mq()?.matches ? 'dark' : 'light';
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function subscribe(listener: () => void) {
  listeners.add(listener);
  const m = mq();
  m?.addEventListener('change', listener);
  return () => {
    listeners.delete(listener);
    m?.removeEventListener('change', listener);
  };
}

export function toggleTheme(): void {
  const next: Theme = read() === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  storage.setRaw(KEY, next);
  emit();
}

/** Light/dark: follows the system until the user picks one (saved, applied before paint in index.html). */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, read);
  return { theme, toggle: toggleTheme };
}
