import { addDays, daysBetween, DAY, dayDiff, ganttStatus, ms, startOfDay } from '@argus/shared';
import type { ReactNode, Ref } from 'react';
import { Icon } from '../../components/ui/Icon';
import { useDrawer } from '../../drawer/DrawerContext';
import { useDashboard } from '../../hooks/useDashboard';
import { cn } from '../../lib/cn';
import { fmtMonth, fmtShort, fmtWeekday } from '../../lib/format';
import { STATUS_LABEL } from '../../lib/labels';
import { depPath, ganttRange, GL, isoWeek, type BarPos } from './geometry';
import { barStatusClass, type GanttGroup } from './types';

const TAG_STYLE: Record<string, string> = {
  important: 'border-transparent bg-[#7d1d5f] text-white',
  client: 'border-transparent bg-[color-mix(in_srgb,var(--low)_16%,var(--surface))] text-low',
};

export function GanttTag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'flex-none rounded-[7px] border border-line bg-surface px-[9px] py-0.5 text-xs leading-normal font-[650] text-fg',
        className,
      )}
    >
      {children}
    </span>
  );
}
const tagClass = (t: string) => TAG_STYLE[t.toLowerCase()];

const barBase = 'absolute z-3 flex h-10 items-center overflow-clip text-left text-fg';
const labelBase = 'sticky left-0 z-1 flex min-w-0 max-w-full items-center whitespace-nowrap text-sm';

export interface GanttTimelineProps {
  groups: GanttGroup[];
  dw: number;
  collapsed: Record<string, boolean>;
  onToggleGroup: (key: string) => void;
  scrollRef: Ref<HTMLDivElement>;
}

/** Horizontally scrolling timeline: header, weekend hatching, today line, bars, dependency arrows. */
export function GanttTimeline({ groups, dw, collapsed, onToggleGroup, scrollRef }: GanttTimelineProps) {
  const { data, now, insights } = useDashboard();
  const { open } = useDrawer();
  const R = ganttRange(data.gantt, now);
  const W = R.days * dw;
  const x0 = (d: string | Date) => daysBetween(R.start, d) * dw;
  const x1 = (d: string | Date) => (daysBetween(R.start, d) + 1) * dw;
  const todayX = x0(now) + ((now.getTime() - startOfDay(now).getTime()) / DAY) * dw;
  const conflicts = new Set(insights.conflicts);
  /** Dependency conflicts in words: the SVG arrows that show them are hidden from assistive tech. */
  const conflictText = (key: string, dependsOn: string[]) => {
    const bad = dependsOn.filter((d) => conflicts.has(`${key}<${d}`));
    return bad.length ? `. Conflict: starts before ${bad.join(', ')} ends` : '';
  };

  /* header ------------------------------------------------------------- */
  const weeks: ReactNode[] = [];
  const days: ReactNode[] = [];
  const hatch: ReactNode[] = [];
  for (let i = 0; i < R.days; i++) {
    const d = addDays(R.start, i);
    const wd = d.getDay();
    if (wd === 1) {
      const e = addDays(d, 6);
      const label =
        dw >= 60
          ? d.getMonth() === e.getMonth()
            ? `${d.getDate()} – ${e.getDate()} ${fmtMonth(d, 'long')}`
            : `${d.getDate()} ${fmtMonth(d, 'short')} – ${e.getDate()} ${fmtMonth(e, 'short')}`
          : fmtShort(d);
      weeks.push(
        <div
          key={`w${i}`}
          style={{ width: dw * 7 }}
          className="flex flex-none items-center justify-between gap-2 overflow-hidden border-r border-line px-3.5 text-[13.5px] font-[750] whitespace-nowrap text-fg-2"
        >
          <span>{label}</span>
          <small className="text-xs font-bold text-fg-3">W{isoWeek(d)}</small>
        </div>,
      );
    }
    const weekend = wd === 0 || wd === 6;
    const today = dayDiff(d, now) === 0;
    const lbl = dw >= 80 ? `${fmtWeekday(d)} ${d.getDate()}` : dw >= 30 ? `${d.getDate()}` : '';
    days.push(
      <div
        key={`d${i}`}
        style={{ width: dw }}
        className={cn(
          'grid flex-none place-items-center overflow-hidden border-r border-line text-[13px] font-semibold whitespace-nowrap text-fg-2',
          weekend && 'hatch text-fg-3',
        )}
      >
        <span className={cn(today && 'rounded-[7px] bg-accent px-2 py-0.5 font-extrabold text-on-accent')}>{lbl}</span>
      </div>,
    );
    if (wd === 6) hatch.push(<span key={`h${i}`} className="hatch absolute inset-y-0" style={{ left: i * dw, width: 2 * dw }} />);
  }

  /* bars ---------------------------------------------------------------- */
  const off = (GL.ROW - GL.BAR) / 2;
  const pos: Record<string, BarPos> = {};
  const bars: ReactNode[] = [];
  const boxes: ReactNode[] = [];
  let y = GL.PAD;

  for (const g of groups) {
    const ps = Math.min(...g.tasks.map((t) => ms(t.start)));
    const pe = Math.max(...g.tasks.map((t) => ms(t.end)));
    const isCollapsed = !!collapsed[g.project.key];
    const top = y;
    const health = g.project.health;
    bars.push(
      <button
        key={`p-${g.project.key}`}
        type="button"
        onClick={() => onToggleGroup(g.project.key)}
        aria-expanded={!isCollapsed}
        data-tip={`${isCollapsed ? 'Show' : 'Hide'} ${g.tasks.length} tasks`}
        style={{ left: x0(new Date(ps)) + 4, top: y + off, width: x1(new Date(pe)) - x0(new Date(ps)) - 8 }}
        className={cn(
          barBase,
          'gantt-project rounded-t-[14px] bg-[color-mix(in_srgb,var(--c)_22%,var(--surface))] hover:bg-[color-mix(in_srgb,var(--c)_28%,var(--surface))]',
          barStatusClass(health),
        )}
      >
        <span
          className="absolute inset-y-0 left-0 rounded-[inherit] bg-[color-mix(in_srgb,var(--c)_36%,var(--surface))]"
          style={{ width: `${g.project.progress}%` }}
        />
        <span className={cn(labelBase, 'gap-2 pb-1.5 pl-3')}>
          <Icon name="chevronDown" size="xs" rotated={isCollapsed} className="text-fg-2" />
          <span className="flex-none font-[650] text-[color-mix(in_srgb,var(--c)_50%,var(--text))]">{g.project.key}</span>
          <span className="min-w-0 truncate font-semibold">{g.project.name}</span>
          {health !== 'on-track' && (
            <GanttTag className={cn('border-c/40 text-c', `st-${health}`)}>{STATUS_LABEL[health]}</GanttTag>
          )}
          <GanttTag>{g.project.progress}%</GanttTag>
        </span>
      </button>,
    );
    y += GL.ROW;

    if (!isCollapsed)
      for (const t of g.tasks) {
        const st = ganttStatus(t, now);
        const left = x0(t.start) + 4;
        const width = Math.max(x1(t.end) - x0(t.start) - 8, dw - 8);
        pos[t.key] = { x1: left, x2: left + width, y: y + GL.ROW / 2 };
        const tip = `${t.key} ${t.title}: ${t.progress}%, ${fmtShort(t.start)} to ${fmtShort(t.end)}${
          t.deadline ? `, deadline ${fmtShort(t.deadline)}` : ''
        }. ${STATUS_LABEL[st]}${conflictText(t.key, t.dependsOn)}`;
        bars.push(
          <button
            key={t.id}
            type="button"
            onClick={() => open('gantt', t.id)}
            data-tip={tip}
            aria-label={tip}
            style={{ left, top: y + off, width }}
            className={cn(
              barBase,
              'rounded-[20px] border border-c/40 bg-[color-mix(in_srgb,var(--c)_14%,var(--surface))] hover:shadow-[0_0_0_3px_color-mix(in_srgb,var(--c)_22%,transparent)]',
              st === 'not-started' && 'border-dashed',
              barStatusClass(st),
            )}
          >
            <span
              className="absolute inset-y-0 left-0 rounded-[inherit] bg-[color-mix(in_srgb,var(--c)_32%,var(--surface))]"
              style={{ width: `${t.progress}%` }}
            />
            <span className={cn(labelBase, 'gap-2.5 pr-3 pl-4')}>
              <span
                className={cn(
                  'flex-none font-[650] text-[color-mix(in_srgb,var(--c)_50%,var(--text))]',
                  st === 'done' && 'line-through',
                )}
              >
                {t.key}
              </span>
              <span className={cn('min-w-0 truncate font-semibold', st === 'done' && 'line-through decoration-fg-3')}>{t.title}</span>
              {t.tags.map((tag) => (
                <GanttTag key={tag} className={tagClass(tag)}>
                  {tag}
                </GanttTag>
              ))}
            </span>
          </button>,
        );
        if (t.deadline && daysBetween(t.end, t.deadline) > 0)
          bars.push(
            <span
              key={`m-${t.id}`}
              className={cn(
                'pointer-events-none absolute z-3 -mt-[5.5px] -ml-[5.5px] size-[11px] rotate-45 border-2 border-c bg-surface',
                barStatusClass(st),
              )}
              style={{ left: x0(t.deadline) + dw / 2, top: y + GL.ROW / 2 }}
            />,
          );
        y += GL.ROW;
      }

    boxes.push(
      <div
        key={`b-${g.project.key}`}
        className="absolute rounded-[18px] border border-dashed border-line-strong bg-surface-2/75"
        style={{
          left: x0(new Date(ps)) - 6,
          top: top - 6,
          width: x1(new Date(pe)) - x0(new Date(ps)) + 12,
          height: y - top + 12,
        }}
      />,
    );
    y += GL.GAP;
  }
  y -= GL.GAP - GL.PAD;

  const paths = data.gantt.flatMap((t) =>
    t.dependsOn
      .filter((d) => pos[d] && pos[t.key])
      .map((d) => {
        const bad = conflicts.has(`${t.key}<${d}`);
        return (
          <path
            key={`${t.key}<${d}`}
            d={depPath(pos[d]!, pos[t.key]!)}
            markerEnd={`url(#${bad ? 'g-arr-bad' : 'g-arr'})`}
            className={cn('fill-none', bad ? 'stroke-crit [stroke-dasharray:5_4] [stroke-width:2]' : 'stroke-dep [stroke-width:1.6]')}
          />
        );
      }),
  );

  return (
    <div
      ref={scrollRef}
      tabIndex={0}
      role="region"
      aria-label="Gantt timeline, scrolls horizontally"
      data-today-x={todayX}
      className="-mx-4 overflow-x-auto overflow-y-hidden overscroll-x-contain border-y border-line [scrollbar-width:thin] md:-mx-[18px]"
    >
      <div className="relative" style={{ width: W }}>
        <div className="flex h-[42px] border-b border-line">{weeks}</div>
        <div className="flex h-[42px] border-b border-line">{days}</div>
        <div
          className="relative"
          style={{
            height: y,
            backgroundImage: 'linear-gradient(90deg, var(--line) 0 1px, transparent 1px)',
            backgroundSize: `${dw}px 100%`,
          }}
        >
          {hatch}
          <span className="absolute inset-y-0 z-1 -ml-px w-0.5 bg-accent opacity-75" style={{ left: todayX }} />
          {boxes}
          <svg className="pointer-events-none absolute top-0 left-0 z-2 overflow-visible" width={W} height={y} aria-hidden="true">
            <defs>
              {[
                ['g-arr', 'var(--dep)'],
                ['g-arr-bad', 'var(--crit)'],
              ].map(([id, color]) => (
                <marker key={id} id={id} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                  <path d="M0 0 L10 5 L0 10 z" style={{ fill: color, stroke: 'none' }} />
                </marker>
              ))}
            </defs>
            {paths}
          </svg>
          {bars}
        </div>
      </div>
    </div>
  );
}
