import type { AttentionLevel } from '@argus/shared';
import { useState } from 'react';
import { Empty, Lamp, LinkButton, lvl, ShowMore } from '../../components/ui/primitives';
import { useSection } from '../../layout/sections';
import { useDashboard } from '../../hooks/useDashboard';
import { cn } from '../../lib/cn';
import { LIST_PREVIEW } from '../../lib/config';
import { AttentionRow } from './AttentionRow';

type Filter = 'all' | 'urgent' | 'action' | 'upcoming';

function Counter({
  n,
  label,
  level,
  pressed,
  onClick,
}: {
  n: number;
  label: string;
  level: AttentionLevel;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'flex flex-col gap-0.5 rounded-md border border-line bg-surface-2 px-3 py-2.5 text-left hover:border-line-strong',
        'aria-pressed:border-c aria-pressed:bg-[color-mix(in_srgb,var(--c)_12%,var(--surface))] aria-pressed:shadow-[inset_0_0_0_1px_var(--c)]',
        lvl(level),
      )}
    >
      <span className="flex items-center gap-2 text-[26px] leading-[1.1] font-extrabold tracking-[-.03em]">
        {n > 0 && <Lamp pulse={level === 'critical'} />}
        {n}
      </span>
      <span className="text-[12.5px] font-[650] text-fg-2">{label}</span>
    </button>
  );
}

/** "Resolve first": every source's items ranked by the attention engine. */
export function AttentionPanel({ className }: { className?: string }) {
  const { insights } = useDashboard();
  const { ref, flashing } = useSection('overview');
  const [filter, setFilter] = useState<Filter>('all');
  const [expanded, setExpanded] = useState(false);

  const items = insights.attention;
  const upcoming = insights.upcoming;
  const crit = items.filter((i) => i.level === 'critical');
  const act = items.filter((i) => i.level === 'high');
  const list = filter === 'urgent' ? crit : filter === 'action' ? act : filter === 'upcoming' ? upcoming : items;
  const shown = expanded ? list : list.slice(0, LIST_PREVIEW);
  const toggleFilter = (f: Filter) => {
    setFilter((cur) => (cur === f ? 'all' : f));
    setExpanded(false);
  };

  const meter = [
    ...(['critical', 'high', 'medium', 'low'] as const).map((l) => ({ l, n: items.filter((i) => i.level === l).length })),
    { l: 'upcoming' as const, n: upcoming.length },
  ].filter((x) => x.n);

  return (
    <section
      id="overview"
      ref={ref}
      aria-labelledby="att-title"
      className={cn(
        'scroll-mt-[calc(var(--topbar-h)+12px)] rounded-lg border border-line bg-surface p-4 shadow-card transition-[box-shadow,border-color] md:px-5 md:pt-[18px] md:pb-4',
        flashing && 'card-flash',
        className,
      )}
    >
      <div className="mb-3.5 flex items-center justify-between gap-2.5">
        <h2 id="att-title" tabIndex={-1} className="text-[15.5px] font-[750]">
          Attention required
        </h2>
        {filter !== 'all' && (
          <LinkButton onClick={() => setFilter('all')}>
            Show everything
          </LinkButton>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Counter n={crit.length} label="Urgent" level="critical" pressed={filter === 'urgent'} onClick={() => toggleFilter('urgent')} />
        <Counter n={act.length} label="Need action" level="high" pressed={filter === 'action'} onClick={() => toggleFilter('action')} />
        <Counter
          n={upcoming.length}
          label="Upcoming, 48h"
          level="upcoming"
          pressed={filter === 'upcoming'}
          onClick={() => toggleFilter('upcoming')}
        />
      </div>
      <div className="mt-3 mb-3.5 flex h-1.5 gap-[3px]" aria-hidden="true">
        {meter.map((x) => (
          <span key={x.l} className={cn('min-w-1.5 basis-0 rounded-full bg-c', lvl(x.l))} style={{ flexGrow: x.n }} />
        ))}
      </div>
      <ul className="flex flex-col" aria-label="Items sorted by priority">
        {shown.map((i) => (
          <AttentionRow key={i.key} item={i} />
        ))}
        {!shown.length && <Empty>Nothing here. You're clear.</Empty>}
      </ul>
      <div className="flex items-center justify-between">
        <ShowMore total={list.length} shown={shown.length} expanded={expanded} onToggle={() => setExpanded((e) => !e)} />
      </div>
    </section>
  );
}
