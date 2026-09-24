import { Brand } from '../components/ui/Brand';
import { Icon } from '../components/ui/Icon';
import { useDrawer } from '../drawer/DrawerContext';
import { useDashboard } from '../hooks/useDashboard';
import { cn } from '../lib/cn';
import { NAV, navTarget, type NavItem } from './nav';
import { useSections } from './sections';

/** The link's accessible name: the label stays even where only the icon shows, plus the count. */
const navLabel = (label: string, n: number, hot: boolean) => (n ? `${label}, ${n}${hot ? ' urgent' : ''}` : label);

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

function useNavState() {
  const { data, now } = useDashboard();
  const { active, goTo } = useSections();
  const current = navTarget(active);
  const countOf = (x: NavItem) => ({ n: x.count?.(data, now) ?? 0, hot: x.hot?.(data) ?? false });
  const onClick = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    goTo(id);
  };
  return { current, countOf, onClick };
}

/** Hidden on phones, icon rail on tablets (768px), full sidebar from 1200px. */
export function Sidebar() {
  const { current, countOf, onClick } = useNavState();
  const { user } = useDashboard();
  const { open } = useDrawer();

  return (
    <aside
      aria-label="Sections"
      className={cn(
        'sticky top-[env(safe-area-inset-top,0px)] hidden h-[calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] flex-col gap-1.5',
        'border-r border-line bg-surface/55 px-3 py-[18px] backdrop-blur-md md:flex md:items-center xl:items-stretch',
      )}
    >
      <Brand className="px-0 pt-1 pb-[18px] xl:px-2" nameClassName="hidden xl:inline" />
      <nav className="flex flex-col gap-0.5">
        {NAV.map((x) => {
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
                'relative flex items-center gap-3 rounded-sm text-sm font-semibold text-fg-2 hover:bg-surface-2 hover:text-fg',
                'size-11 justify-center p-0 xl:h-10 xl:w-auto xl:justify-start xl:px-2.5',
                isCurrent &&
                  "bg-accent-soft text-accent-text before:absolute before:top-2.5 before:bottom-2.5 before:-left-4 before:w-[3px] before:rounded-r-[3px] before:bg-accent before:content-[''] xl:before:-left-3",
              )}
            >
              <Icon name={x.icon} />
              <span className="hidden xl:inline">{x.label}</span>
              <Count
                n={n}
                hot={hot}
                className="absolute top-[3px] right-px m-0 h-4 min-w-4 px-1 text-[10px] xl:static xl:ml-auto xl:h-5 xl:min-w-[22px] xl:px-1.5 xl:text-[11.5px]"
              />
            </a>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-2">
        <button
          type="button"
          onClick={() => open('profile', 'me')}
          aria-label={`${user.name}: profile and data sources`}
          data-tip-rail="Profile and data sources"
          className="flex w-full items-center justify-center gap-2.5 rounded-md border border-line bg-surface-2 p-1.5 xl:justify-start xl:p-2.5"
        >
          <Avatar initials={user.initials} />
          <span className="hidden min-w-0 leading-tight xl:block">
            <b className="block text-[13.5px]">{user.name}</b>
            <span className="block truncate text-xs text-fg-3">{user.role}</span>
          </span>
        </button>
      </div>
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
  const { current, countOf, onClick } = useNavState();
  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-line bg-surface/88 px-1 pt-1.5 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-lg md:hidden"
    >
      {NAV.filter((x) => x.short).map((x) => {
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
