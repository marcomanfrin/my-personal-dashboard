import { ms, type Resource, type SourceStatus } from '@argus/shared';
import { useEffect, useRef, useState } from 'react';
import { useDrawer } from '../drawer/DrawerContext';
import { useDashboard } from '../hooks/useDashboard';
import { cn } from '../lib/cn';
import { SOURCE_STALE_MS } from '../lib/config';
import { relPast } from '../lib/format';
import { RESOURCE_LABEL } from '../lib/labels';

/** How well Argus can see a source: the state of its eye. */
export type EyeState = 'open' | 'drowsy' | 'shut' | 'asleep';

const RANK: Record<EyeState, number> = { open: 0, asleep: 1, drowsy: 2, shut: 3 };

const STATE_TEXT: Record<EyeState, string> = {
  open: 'up to date',
  drowsy: 'not synced recently',
  shut: 'last run failed',
  asleep: 'never synced',
};

export function eyeState(s: SourceStatus | undefined, now: Date): EyeState {
  if (!s) return 'asleep';
  if (s.lastRun?.status === 'error') return 'shut';
  if (!s.lastSyncAt) return 'asleep';
  return now.getTime() - ms(s.lastSyncAt) > SOURCE_STALE_MS ? 'drowsy' : 'open';
}

const worst = (states: EyeState[]): EyeState => states.reduce((a, b) => (RANK[b] > RANK[a] ? b : a), 'open');

/** Blinks once whenever `key` changes after the first render: a sync just landed. */
function useBlink(key: string) {
  const first = useRef(key);
  const [blink, setBlink] = useState(0);
  useEffect(() => {
    if (key !== first.current) {
      first.current = key;
      setBlink((b) => b + 1);
    }
  }, [key]);
  return blink;
}

/** The Argus eye, drawn open, half-closed or shut. Colour only when something is wrong. */
export function Eye({ state, blinkKey = '', className }: { state: EyeState; blinkKey?: string; className?: string }) {
  const blink = useBlink(blinkKey);
  return (
    <svg
      key={blink}
      viewBox="0 0 20 12"
      aria-hidden="true"
      className={cn(
        'h-3 w-5 flex-none origin-center',
        blink > 0 && 'animate-blink',
        state === 'shut' ? 'st-error text-c' : state === 'drowsy' ? 'st-warning text-c' : 'text-fg-3',
        state === 'asleep' && 'opacity-60',
        className,
      )}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {state === 'open' && (
        <>
          <path d="M1.5 6C4 2.2 7 1 10 1s6 1.2 8.5 5c-2.5 3.8-5.5 5-8.5 5s-6-1.2-8.5-5Z" />
          <circle cx="10" cy="6" r="2.3" fill="currentColor" stroke="none" />
        </>
      )}
      {state === 'drowsy' && (
        <>
          <path d="M1.5 6c2.5 3.8 5.5 5 8.5 5s6-1.2 8.5-5" />
          <path d="M1.5 6h17" />
          <path d="M7.7 6a2.3 2.3 0 0 0 4.6 0" fill="currentColor" stroke="none" />
        </>
      )}
      {(state === 'shut' || state === 'asleep') && (
        <>
          <path d="M1.5 5c2.5 3 5.5 4 8.5 4s6-1 8.5-4" />
          <path d="M5 8.2 4 10.5M10 9v2.3M15 8.2l1 2.3" />
        </>
      )}
    </svg>
  );
}

/** One eye for the sources behind a widget; the worst state wins. */
export function SourceEyes({ resources, className }: { resources: Resource[]; className?: string }) {
  const { sources, now } = useDashboard();
  // A resource no agent feeds (local reminders, say) has nothing to watch.
  const own = resources
    .map((r) => sources.find((s) => s.resource === r))
    .filter((s): s is SourceStatus => !!s && (s.agents.length > 0 || !!s.lastSyncAt || !!s.lastRun));
  if (!own.length) return null;
  const state = worst(own.map((s) => eyeState(s, now)));
  const synced = own.map((s) => s.lastSyncAt).filter((d): d is string => !!d);
  const last = synced.sort().at(-1);
  const names = own.map((s) => RESOURCE_LABEL[s.resource]).join(' and ');
  const text = `${names}: ${STATE_TEXT[state]}${last ? `, synced ${relPast(last, now)}` : ''}`;
  return (
    <span role="img" aria-label={text} data-tip={text} className={cn('inline-flex', className)}>
      <Eye state={state} blinkKey={last} />
    </span>
  );
}

/** Top bar: every source's eye in a row; opens the profile with the details. */
export function SourceStrip({ className }: { className?: string }) {
  const { sources, now } = useDashboard();
  const { open } = useDrawer();
  if (!sources.length) return null;
  const states = sources.map((s) => eyeState(s, now));
  const trouble = states.filter((s) => s === 'shut' || s === 'drowsy').length;
  const label = trouble
    ? `Data sources: ${trouble} of ${sources.length} need a look`
    : `Data sources: all ${sources.length} up to date`;
  return (
    <button
      type="button"
      aria-label={label}
      data-tip={label}
      onClick={() => open('profile', 'me')}
      className={cn('flex h-[38px] items-center gap-1 rounded-[10px] px-2.5 hover:bg-surface-2', className)}
    >
      {sources.map((s, i) => (
        <Eye key={s.resource} state={states[i]!} blinkKey={s.lastSyncAt ?? ''} className="w-4" />
      ))}
    </button>
  );
}
