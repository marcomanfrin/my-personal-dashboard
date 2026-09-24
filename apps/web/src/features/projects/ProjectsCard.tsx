import { STATUS_RANK } from '@command/shared';
import { Card } from '../../components/ui/Card';
import { Lamp, Pill, ProgressBar, SrOnly } from '../../components/ui/primitives';
import { useDashboard } from '../../hooks/useDashboard';
import { useSections } from '../../layout/sections';
import { cn } from '../../lib/cn';
import { dueText } from '../../lib/format';
import { STATUS_LABEL } from '../../lib/labels';
import { setGanttProject } from '../gantt/focus';

/** Project health, worst first. Clicking one focuses it in the Gantt. */
export function ProjectsCard({ className }: { className?: string }) {
  const { data, insights, now } = useDashboard();
  const { goTo } = useSections();
  const list = [...insights.projects].sort((a, b) => STATUS_RANK[a.health] - STATUS_RANK[b.health]);
  const taskById = new Map(data.gantt.map((t) => [t.id, t]));

  return (
    <Card id="projects" title="Projects" icon="folder" className={className} sub={<><b>{list.length}</b> active</>}>
      <ul className="flex flex-col gap-1">
        {list.map((p) => {
          const next = p.nextTaskId ? taskById.get(p.nextTaskId) : undefined;
          const lamp = p.health === 'delayed' ? 'lvl-critical' : p.health === 'at-risk' ? 'lvl-high' : 'lvl-upcoming';
          return (
            <li key={p.key} className="[&+&]:border-t [&+&]:border-line">
              <button
                type="button"
                data-tip="Show in Gantt"
                onClick={() => {
                  setGanttProject(p.key);
                  goTo('gantt');
                }}
                className="flex w-full flex-col gap-[7px] rounded-md px-2 py-[11px] text-left hover:bg-surface-2"
              >
                <span className="flex items-center gap-2.5">
                  <span className={lamp}>
                    <Lamp />
                  </span>
                  <b className="min-w-0 flex-1 text-sm font-bold">{p.name}</b>
                  <Pill className={`st-${p.health}`}>{STATUS_LABEL[p.health]}</Pill>
                  <span className="text-[13px] font-extrabold">{p.progress}%</span>
                </span>
                <span className={cn('block', `st-${p.health}`)}>
                  <ProgressBar value={p.progress} />
                </span>
                <span className="text-[12.5px] text-fg-3">
                  {next ? (
                    <>
                      Next: <b className="font-[650] text-fg-2">{next.title}</b>, ends {dueText(next.end, false, now)}
                    </>
                  ) : (
                    'All tasks done'
                  )}
                </span>
                <SrOnly>, show in Gantt</SrOnly>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
