import { ms, type GanttStatus } from '@command/shared';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button, Empty, Segmented, Tag } from '../../components/ui/primitives';
import { useActions } from '../../hooks/useActions';
import { useDashboard } from '../../hooks/useDashboard';
import { cn } from '../../lib/cn';
import { plural } from '../../lib/format';
import { STATUS_LABEL } from '../../lib/labels';
import { useGanttFocus } from './focus';
import { GanttList } from './GanttList';
import { GanttTimeline } from './GanttTimeline';
import { todayScrollLeft, ZOOMS, type Zoom } from './geometry';
import { barStatusClass, type GanttGroup } from './types';

type View = 'timeline' | 'list';
const LEGEND: GanttStatus[] = ['on-track', 'at-risk', 'delayed', 'done', 'not-started'];

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** The owner's tasks from the company plan, grouped by project. */
export function GanttCard({ className }: { className?: string }) {
  const { data, insights } = useDashboard();
  const { recalcGantt, recalculating } = useActions();
  const [view, setView] = useState<View>('timeline');
  const [zoom, setZoom] = useState<Zoom>('week');
  const [project, setProject] = useGanttFocus();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const scroller = useRef<HTMLDivElement | null>(null);
  const dw = ZOOMS[zoom].dw;

  const groups: GanttGroup[] = insights.projects
    .filter((p) => project === 'all' || p.key === project)
    .map((p) => ({
      project: p,
      tasks: data.gantt.filter((t) => t.projectKey === p.key).sort((a, b) => ms(a.start) - ms(b.start)),
    }));
  const conflicts = insights.conflicts.length;
  const openTasks = data.gantt.filter((t) => t.progress < 100).length;

  const scrollToToday = useCallback(
    (smooth: boolean) => {
      const el = scroller.current;
      if (!el) return;
      const left = todayScrollLeft(Number(el.dataset.todayX), el.clientWidth, dw);
      el.scrollTo({ left, behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto' });
    },
    [dw],
  );
  // Re-centre on today whenever the layout changes; not on every data refresh.
  useLayoutEffect(() => scrollToToday(false), [scrollToToday, view, project]);
  // The card can mount collapsed: centre once the timeline appears.
  const setScroller = useCallback(
    (el: HTMLDivElement | null) => {
      const first = !scroller.current && el;
      scroller.current = el;
      if (first) scrollToToday(false);
    },
    [scrollToToday],
  );
  useEffect(() => {
    if (project !== 'all' && !insights.projects.some((p) => p.key === project)) setProject('all');
  }, [project, insights.projects, setProject]);

  const toolbar = (
    <div className="flex flex-wrap items-center justify-between gap-x-2.5 gap-y-2">
      <Segmented
        label="Gantt view"
        value={view}
        onChange={setView}
        options={[
          { id: 'timeline', label: 'Timeline' },
          { id: 'list', label: 'List' },
        ]}
      />
      <div className="flex flex-wrap items-center gap-2">
        <label>
          <span className="sr-only">Filter by project</span>
          <select className="select" value={project} onChange={(e) => setProject(e.target.value)}>
            <option value="all">All projects</option>
            {insights.projects.map((p) => (
              <option key={p.key} value={p.key}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        {view === 'timeline' && (
          <>
            <label>
              <span className="sr-only">Zoom</span>
              <select className="select" value={zoom} onChange={(e) => setZoom(e.target.value as Zoom)}>
                {Object.entries(ZOOMS).map(([k, z]) => (
                  <option key={k} value={k}>
                    {z.label}
                  </option>
                ))}
              </select>
            </label>
            <Button size="sm" onClick={() => scrollToToday(true)}>
              Today
            </Button>
          </>
        )}
        <Button
          size="sm"
          icon="refresh"
          variant={conflicts ? 'warn' : 'default'}
          disabled={recalculating}
          onClick={recalcGantt}
          aria-describedby="gantt-recalc-desc"
          tip={
            conflicts
              ? `${conflicts} ${plural(conflicts, 'task starts', 'tasks start')} before the task it depends on ends`
              : 'Schedule respects all dependencies'
          }
        >
          Recalculate
          <span id="gantt-recalc-desc" className="sr-only">
            {conflicts
              ? `${conflicts} ${plural(conflicts, 'task starts', 'tasks start')} before the task it depends on ends`
              : 'Schedule respects all dependencies'}
          </span>
          {conflicts > 0 && (
            <span aria-hidden="true" className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-high px-[5px] text-[11px] font-extrabold text-white">
              {conflicts}
            </span>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <Card
      id="gantt"
      title="Personal Gantt"
      icon="gantt"
      className={className}
      sub={
        <>
          <b>{openTasks}</b> open tasks assigned to you, from the company plan
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {toolbar}
        {!groups.length ? (
          <Empty as="p">No tasks assigned to you in this project.</Empty>
        ) : view === 'timeline' ? (
          <GanttTimeline
            groups={groups}
            dw={dw}
            collapsed={collapsed}
            onToggleGroup={(k) => setCollapsed((c) => ({ ...c, [k]: !c[k] }))}
            scrollRef={setScroller}
          />
        ) : (
          <GanttList groups={groups} />
        )}
        <div className="flex flex-wrap gap-x-3.5 gap-y-1.5">
          {LEGEND.map((st) => (
            <Tag key={st} swatch className={barStatusClass(st)}>
              {STATUS_LABEL[st]}
            </Tag>
          ))}
          {view === 'timeline' && (
            <>
              <Tag>
                <span className="h-0.5 w-4 rounded-sm bg-dep" />
                Depends on
              </Tag>
              {conflicts > 0 && (
                <Tag>
                  <span className={cn('h-0.5 w-4 bg-[repeating-linear-gradient(90deg,var(--crit)_0_4px,transparent_4px_7px)]')} />
                  Starts too early
                </Tag>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
