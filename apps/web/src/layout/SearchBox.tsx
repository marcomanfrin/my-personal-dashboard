import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Icon } from '../components/ui/Icon';
import { useDrawer } from '../drawer/DrawerContext';
import { useClickOutside } from '../hooks/useClickOutside';
import { useDashboard } from '../hooks/useDashboard';
import { cn } from '../lib/cn';
import { search } from '../lib/search';

/**
 * Search across every source. Inline in the topbar from 768px; on phones a
 * button opens it as an overlay over the topbar. `/` or Ctrl/Cmd+K focuses it.
 */
export function SearchBox({ mobileOpen, onMobileClose }: { mobileOpen: boolean; onMobileClose: () => void }) {
  const { data, now } = useDashboard();
  const { openRecord } = useDrawer();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const results = useMemo(() => search(data, now, query), [data, now, query]);
  const showResults = focused && query.trim().length > 0;

  const reset = () => {
    setQuery('');
    setFocused(false);
    onMobileClose();
  };
  useClickOutside(root, () => setFocused(false), focused);

  useEffect(() => {
    if (mobileOpen) input.current?.focus();
  }, [mobileOpen]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test((document.activeElement as HTMLElement | null)?.tagName ?? '');
      if (!typing && (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'))) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const choose = (i: number) => {
    const r = results[i];
    if (!r) return;
    reset();
    input.current?.blur();
    openRecord(r.resource, r.id);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!results.length) return;
      setActive((a) => (e.key === 'ArrowDown' ? (a + 1) % results.length : (a - 1 + results.length) % results.length));
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      choose(active);
    }
    if (e.key === 'Escape') {
      reset();
      input.current?.blur();
    }
  };

  return (
    <div
      ref={root}
      role="search"
      className={cn(
        'relative hidden max-w-[420px] flex-1 md:block',
        mobileOpen && 'absolute inset-x-2.5 top-2.5 block max-w-none md:relative md:inset-auto',
      )}
    >
      <label className="flex h-10 items-center gap-2 rounded-[11px] border border-line bg-surface px-3 text-fg-3 focus-within:border-accent/60 focus-within:shadow-[0_0_0_3px_var(--accent-soft)]">
        <Icon name="search" />
        <span className="sr-only">Search everything</span>
        <input
          ref={input}
          type="search"
          autoComplete="off"
          placeholder="Search mail, PRs, tasks, events"
          aria-controls="search-results"
          aria-expanded={showResults}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onFocus={() => setFocused(true)}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 border-0 bg-transparent font-medium text-fg outline-0 placeholder:text-fg-3"
        />
        <span aria-hidden="true" className={cn('rounded-[5px] border border-line-strong px-1.5 text-[11px] font-bold', mobileOpen && 'hidden md:inline')}>
          /
        </span>
        {mobileOpen && (
          <button type="button" aria-label="Close search" onClick={reset} className="grid size-[30px] place-items-center md:hidden">
            <Icon name="x" size="sm" />
          </button>
        )}
      </label>
      {showResults && (
        <div
          id="search-results"
          role="listbox"
          className="absolute inset-x-0 top-[calc(100%+8px)] z-40 max-h-[min(70vh,460px)] overflow-y-auto rounded-md border border-line-strong bg-surface shadow-pop"
        >
          {results.map((r, i) => {
            const header = results[i - 1]?.group !== r.group;
            return (
              <div key={`${r.resource}:${r.id}`}>
                {header && <div className="px-3.5 pt-2 pb-1 text-xs font-bold text-fg-3">{r.group}</div>}
                <button
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(i)}
                  onMouseEnter={() => setActive(i)}
                  className={cn('flex w-full items-start gap-2.5 px-3.5 py-[9px] text-left hover:bg-surface-2', i === active && 'bg-surface-2')}
                >
                  <Icon name={r.icon} size="sm" className="mt-0.5 text-fg-3" />
                  <div>
                    <b className="block text-[13.5px] leading-[1.35] font-[650]">{r.title}</b>
                    <span className="text-[12.5px] text-fg-3">{r.sub}</span>
                  </div>
                </button>
              </div>
            );
          })}
          {!results.length && (
            <p className="px-3.5 py-[18px] text-[13.5px] text-fg-3">
              No matches for “{query}”. Try a sender, repo or project name.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
