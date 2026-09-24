import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { Icon } from '../components/ui/Icon';
import { useDrawer } from '../drawer/DrawerContext';
import { useClickOutside } from '../hooks/useClickOutside';
import { useDashboard } from '../hooks/useDashboard';
import { cn } from '../lib/cn';
import { search } from '../lib/search';

const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/**
 * Search across every source, as an ARIA combobox: focus stays in the input and
 * arrows move the active option. Inline in the topbar from 768px; on phones
 * `trigger` opens it as an overlay over the topbar. Ctrl/Cmd+K focuses it.
 */
export function SearchBox({
  mobileOpen,
  onMobileClose,
  trigger,
}: {
  mobileOpen: boolean;
  /** `refocus`: give focus back to the phone trigger (closed without choosing). */
  onMobileClose: (refocus?: boolean) => void;
  trigger: RefObject<HTMLButtonElement | null>;
}) {
  const { data, now } = useDashboard();
  const { openRecord } = useDrawer();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const results = useMemo(() => search(data, now, query), [data, now, query]);
  const showResults = focused && query.trim().length > 0;
  const groups = useMemo(() => {
    const out: { name: string; items: { r: (typeof results)[number]; i: number }[] }[] = [];
    results.forEach((r, i) => {
      const last = out[out.length - 1];
      if (last?.name === r.group) last.items.push({ r, i });
      else out.push({ name: r.group, items: [{ r, i }] });
    });
    return out;
  }, [results]);

  const reset = (refocus = false) => {
    setQuery('');
    setFocused(false);
    if (mobileOpen) onMobileClose(refocus);
  };
  useClickOutside(root, () => setFocused(false), focused);

  useEffect(() => {
    if (mobileOpen) input.current?.focus();
  }, [mobileOpen]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      // A modified shortcut only: single-key ones clash with screen readers and speech input (WCAG 2.1.4).
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        input.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (showResults) document.getElementById(`search-opt-${active}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [active, showResults]);

  const choose = (i: number) => {
    const r = results[i];
    if (!r) return;
    const returnTo = mobileOpen ? trigger.current : input.current;
    reset();
    input.current?.blur();
    openRecord(r.resource, r.id, returnTo);
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
      if (query) setQuery('');
      else {
        reset(true);
        input.current?.blur();
      }
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
      <label className="flex h-10 items-center gap-2 rounded-[11px] border border-control bg-surface px-3 text-fg-3 focus-within:border-accent focus-within:outline-2 focus-within:outline-accent">
        <Icon name="search" />
        <span className="sr-only">Search everything</span>
        <input
          ref={input}
          type="text"
          role="combobox"
          autoComplete="off"
          placeholder="Search mail, PRs, tasks, events"
          aria-autocomplete="list"
          aria-controls="search-results"
          aria-expanded={showResults}
          aria-activedescendant={showResults && results.length ? `search-opt-${active}` : undefined}
          aria-keyshortcuts="Control+K Meta+K"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onFocus={() => setFocused(true)}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 border-0 bg-transparent font-medium text-fg outline-0 placeholder:text-fg-3"
        />
        <kbd
          aria-hidden="true"
          className={cn('rounded-[5px] border border-line-strong px-1.5 font-sans text-[11px] font-bold whitespace-nowrap', mobileOpen && 'hidden md:inline')}
        >
          {isMac() ? '⌘K' : 'Ctrl K'}
        </kbd>
        {mobileOpen && (
          <button type="button" aria-label="Close search" onClick={() => reset(true)} className="grid size-[30px] place-items-center md:hidden">
            <Icon name="x" size="sm" />
          </button>
        )}
      </label>
      <span role="status" className="sr-only">
        {showResults ? `${results.length} ${results.length === 1 ? 'result' : 'results'}` : ''}
      </span>
      {showResults && (
        <div className="absolute inset-x-0 top-[calc(100%+8px)] z-40 max-h-[min(70vh,460px)] overflow-y-auto rounded-md border border-line-strong bg-surface shadow-pop">
          <div id="search-results" role="listbox" aria-label="Search results">
            {groups.map((g, gi) => (
              <div key={g.name} role="group" aria-labelledby={`search-group-${gi}`}>
                <div id={`search-group-${gi}`} role="presentation" className="px-3.5 pt-2 pb-1 text-xs font-bold text-fg-3">
                  {g.name}
                </div>
                {g.items.map(({ r, i }) => (
                  <div
                    key={`${r.resource}:${r.id}`}
                    id={`search-opt-${i}`}
                    role="option"
                    aria-selected={i === active}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(i)}
                    onMouseEnter={() => setActive(i)}
                    className={cn(
                      'flex w-full cursor-pointer items-start gap-2.5 px-3.5 py-[9px] text-left hover:bg-surface-2',
                      i === active && 'bg-surface-2 shadow-[inset_3px_0_0_var(--accent)]',
                    )}
                  >
                    <Icon name={r.icon} size="sm" className="mt-0.5 text-fg-3" />
                    <div>
                      <b className="block text-[13.5px] leading-[1.35] font-[650]">{r.title}</b>
                      <span className="text-[12.5px] text-fg-3">{r.sub}</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
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
