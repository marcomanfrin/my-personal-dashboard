import { useEffect, useMemo, useState } from 'react';
import { Brand } from '../components/ui/Brand';
import { Icon } from '../components/ui/Icon';
import { useDashboard } from '../hooks/useDashboard';
import { cn } from '../lib/cn';
import { usePreference } from '../hooks/usePreference';
import { storage } from '../lib/storage';
import { useVisibleWidgetIds } from './boardLayout';
import { navItems, navTarget, type NavItem } from './nav';
import { useSections } from './sections';

/** The link's accessible name: the label stays even where only the icon shows, plus the count. */
const navLabel = (label: string, n: number, hot: boolean) => (n ? `${label}, ${n}${hot ? ' urgent' : ''}` : label);

/**
 * Sidebar geometry is the same in both states: 16px gutter + 44px items fill the 76px
 * rail exactly, so icons never move while the width animates. Labels fade and are
 * clipped by the sidebar edge instead of popping in and out.
 */
const railItem =
  'relative flex h-10 w-full items-center gap-3 rounded-sm px-[13px] text-sm font-semibold text-fg-2 hover:bg-surface-2 hover:text-fg';
const railLabel =
  'whitespace-nowrap opacity-0 transition-opacity duration-150 nav-full:opacity-100 nav-full:delay-100';

/** Visual badge only; its meaning is in the link's `navLabel`. */
function Count({ n, hot, className }: { n: number; hot: boolean; className?: string }) {
  if (!n) return null;
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid place-items-center rounded-full font-bold',
        hot ? 'bg-crit/16 text-crit' : 'bg-surface-3 text-fg-2',
        className,
      )}
    >
      {n}
    </span>
  );
}

const COLLAPSED_KEY = 'cc-sidebar-collapsed';

const applyCollapsed = (collapsed: boolean) => {
  if (collapsed) document.documentElement.dataset.sidebar = 'collapsed';
  else delete document.documentElement.dataset.sidebar;
};

/**
 * Collapsed state of the full sidebar (a user preference), mirrored on
 * `<html data-sidebar>` so CSS can size the layout.
 */
function useSidebarCollapsed(): [boolean, () => void] {
  const [collapsed, setCollapsed] = usePreference('sidebarCollapsed', COLLAPSED_KEY, false);
  // Before the first paint (local copy): no flash of the wrong width.
  useState(() => applyCollapsed(storage.get(COLLAPSED_KEY, false)));
  useEffect(() => applyCollapsed(collapsed), [collapsed]);
  useEffect(() => () => applyCollapsed(false), []);
  return [collapsed, () => setCollapsed((c) => !c)];
}

function useNavState() {
  const { data, now } = useDashboard();
  const { active, goTo, order } = useSections();
  const current = navTarget(active);
  const countOf = (x: NavItem) => ({ n: x.count?.(data, now) ?? 0, hot: x.hot?.(data) ?? false });
  const onClick = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    goTo(id);
  };
  // Same order as the board shows (the dense grid can pull a widget up into a gap);
  // the saved order until the board is measured, or while it is being edited.
  // A hidden widget has nothing to scroll to, so it stays out.
  const visibleIds = useVisibleWidgetIds();
  const items = useMemo(() => navItems(sortByRendered(visibleIds, order)), [visibleIds, order]);
  return { current, countOf, onClick, items };
}

/**
 * Hidden on phones, icon rail on tablets (768px), full sidebar from 1200px. From
 * 1200px the user can collapse it to the rail; the choice is remembered.
 */
export function Sidebar() {
  const { current, countOf, onClick, items } = useNavState();
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();

  return (
    <aside
      aria-label="Sections"
      className={cn(
        'sticky top-[env(safe-area-inset-top,0px)] hidden h-[calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] flex-col gap-1.5',
        'overflow-x-hidden overflow-y-auto border-r border-line bg-surface/55 px-4 py-[18px] backdrop-blur-md md:flex',
      )}
    >
      <Brand className="px-[7px] pt-1 pb-[18px]" nameClassName={railLabel} />
      <nav className="flex flex-col gap-0.5">
        {items.map((x) => {
          const { n, hot } = countOf(x);
          const isCurrent = current === x.id;
          return (
            <a
              key={x.id}
              href={`#${x.id}`}
              onClick={onClick(x.id)}
              aria-current={isCurrent}
              aria-label={navLabel(x.label, n, hot)}
              data-tip-rail={x.label}
              className={cn(
                railItem,
                isCurrent &&
                  "bg-accent-soft text-accent-text before:absolute before:top-2.5 before:bottom-2.5 before:-left-4 before:w-[3px] before:rounded-r-[3px] before:bg-accent before:content-['']",
              )}
            >
              <Icon name={x.icon} />
              <span className={railLabel}>{x.label}</span>
              {/* Rides the item's right edge: corner dot on the rail, pill at the end of the row when full. */}
              <Count
                n={n}
                hot={hot}
                className={cn(
                  'absolute top-[2px] right-px h-4 min-w-4 px-1 text-[10px] transition-all duration-300 ease-[cubic-bezier(.2,.8,.2,1)]',
                  'nav-full:top-2.5 nav-full:right-2 nav-full:h-5 nav-full:min-w-[22px] nav-full:px-1.5 nav-full:text-[11.5px]',
                )}
              />
            </a>
          );
        })}
      </nav>
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        data-tip-rail="Expand sidebar"
        className={cn(railItem, 'mt-auto hidden flex-none xl:flex')}
      >
        <Icon
          name="sidebar"
          className={cn('transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)]', collapsed && 'rotate-180')}
        />
        <span className={railLabel}>Collapse</span>
      </button>
    </aside>
  );
}

/** Round initials badge with the brand gradient. */
export function Avatar({ initials, className }: { initials: string; className?: string }) {
  return (
    <span
      className={cn(
        'grid size-9 flex-none place-items-center rounded-full bg-[linear-gradient(135deg,var(--accent),color-mix(in_srgb,var(--accent)_50%,#2fd3bf))] text-[13px] font-extrabold text-white',
        className,
      )}
    >
      {initials}
    </span>
  );
}

/** Fixed bottom bar on phones: the six main sections. */
export function BottomNav() {
  const { current, countOf, onClick, items } = useNavState();
  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-line bg-surface/88 px-1 pt-1.5 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-lg md:hidden"
    >
      {items.filter((x) => x.short).map((x) => {
        const { n, hot } = countOf(x);
        const isCurrent = current === x.id;
        return (
          <a
            key={x.id}
            href={`#${x.id}`}
            onClick={onClick(x.id)}
            aria-current={isCurrent}
            aria-label={navLabel(x.label, n, hot)}
            className={cn(
              'relative flex min-h-[50px] flex-col items-center justify-center gap-[3px] rounded-[10px] py-1.5 text-[10.5px] font-bold',
              isCurrent ? 'text-accent-text' : 'text-fg-3',
            )}
          >
            <Icon name={x.icon} strokeWidth={isCurrent ? 2.2 : 1.8} />
            <span>{x.short}</span>
            <Count n={n} hot={hot} className="absolute top-0.5 left-[calc(50%+4px)] h-4 min-w-4 px-1 text-[10px]" />
          </a>
        );
      })}
    </nav>
  );
}

/**
 * The ids on screen in rendered order, then the ones without a section element
 * (the KPIs), as saved. Nothing on screen (the editor is open): the saved order.
 */
function sortByRendered(ids: readonly string[], rendered: readonly string[]): readonly string[] {
  const shown = new Set(ids);
  const onScreen = rendered.filter((id) => shown.has(id));
  if (!onScreen.length) return ids;
  const measured = new Set(onScreen);
  return [...onScreen, ...ids.filter((id) => !measured.has(id))];
}
