import type { ReactNode } from 'react';
import { useSection } from '../../layout/sections';
import { cn } from '../../lib/cn';
import { Icon } from './Icon';
import type { IconName } from './icons';

export interface CardProps {
  /** Section id: anchor for navigation, key for the persisted collapsed state. */
  id: string;
  title: string;
  icon: IconName;
  sub?: ReactNode;
  /** Controls in the header; hidden while collapsed. */
  tools?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** A dashboard widget: header with icon, title, subtitle, tools and a collapse toggle. */
export function Card({ id, title, icon, sub, tools, className, children }: CardProps) {
  const { collapsed, toggle, flashing, ref } = useSection(id);
  return (
    <section
      id={id}
      ref={ref}
      aria-labelledby={`${id}-title`}
      className={cn(
        'flex min-w-0 scroll-mt-[calc(var(--topbar-h)+12px)] flex-col rounded-lg border border-line bg-surface shadow-card transition-[box-shadow,border-color] duration-250',
        flashing && 'card-flash',
        className,
      )}
    >
      <header
        className={cn(
          'flex flex-wrap items-center gap-2.5 px-4 pt-3.5 pr-3.5 pb-2.5 md:px-[18px] md:pt-4 md:pr-4 md:pb-3',
          collapsed ? 'pb-3.5 md:pb-3.5' : 'border-b border-line',
        )}
      >
        <div className="flex min-w-0 flex-[1_1_200px] items-center gap-2.5">
          <span className="grid size-8 flex-none place-items-center rounded-[10px] border border-line bg-surface-2 text-fg-2">
            <Icon name={icon} />
          </span>
          <div>
            <h2 id={`${id}-title`} tabIndex={-1} className="text-[15.5px] leading-tight font-[750] tracking-[-.01em]">
              {title}
            </h2>
            {sub && <p className="text-[12.5px] font-semibold text-fg-3 [&_b]:text-fg-2">{sub}</p>}
          </div>
        </div>
        <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-1.5">
          {!collapsed && tools}
          <button
            type="button"
            onClick={toggle}
            aria-expanded={!collapsed}
            aria-controls={collapsed ? undefined : `${id}-body`}
            aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${title}`}
            data-tip={collapsed ? 'Expand' : 'Collapse'}
            className="relative grid size-[38px] flex-none place-items-center rounded-[10px] text-fg-2 hover:bg-surface-2 hover:text-fg"
          >
            <Icon name="chevronDown" rotated={collapsed} />
          </button>
        </div>
      </header>
      {!collapsed && (
        <div id={`${id}-body`} className="min-w-0 px-4 pt-3 pb-4 md:px-[18px] md:pt-3.5 md:pb-[18px]">
          {children}
        </div>
      )}
    </section>
  );
}
