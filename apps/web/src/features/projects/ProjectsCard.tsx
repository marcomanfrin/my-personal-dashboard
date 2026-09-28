import { STATUS_RANK } from '@argus/shared';
import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Empty, IconButton, Lamp, Pill, ProgressBar, SrOnly, Toggle } from '../../components/ui/primitives';
import { delegateTarget, useDrawer } from '../../drawer/DrawerContext';
import { useDashboard } from '../../hooks/useDashboard';
import { useSections } from '../../layout/sections';
import { cn } from '../../lib/cn';
import { dueText } from '../../lib/format';
import { STATUS_LABEL } from '../../lib/labels';
import { setGanttProject } from '../gantt/focus';
import { JobBadge } from '../jobs/JobStatus';

/** Project health, worst first. Clicking one focuses it in the Gantt. */
export function ProjectsCard({ className }: { className?: string }) {
  const { data, insights, now } = useDashboard();
  const { goTo } = useSections();
  const { open } = useDrawer();
  const projectByKey = new Map(data.projects.map((x) => [x.key, x]));
  const [showDone, setShowDone] = useState(false);
  const active = insights.projects.filter((p) => p.openTasks > 0).length;
  const list = insights.projects
    .filter((p) => showDone || p.openTasks > 0)
    .sort((a, b) => STATUS_RANK[a.health] - STATUS_RANK[b.health]);
  const taskById = new Map(data.gantt.map((t) => [t.id, t]));

  return (
    <Card
      id="projects"
      title="Projects"
      icon="folder"
      className={className}
      sub={
        <>
          <b>{active}</b> active
        </>
      }
      tools={
        <Toggle checked={showDone} onChange={setShowDone}>
          Completed
        </Toggle>
      }
    >
      <ul className="flex flex-col gap-1">
        {list.map((p) => {
          const next = p.nextTaskId ? taskById.get(p.nextTaskId) : undefined;
          const record = projectByKey.get(p.key);
          const lamp = p.health === 'delayed' ? 'lvl-critical' : p.health === 'at-risk' ? 'lvl-high' : 'lvl-upcoming';
          return (
            <li key={p.key} className="group flex items-start gap-1 [&+&]:border-t [&+&]:border-line">
              <button
                type="button"
                data-tip="Show in Gantt"
                onClick={() => {
                  setGanttProject(p.key);
                  goTo('gantt');
                }}
                className="flex min-w-0 flex-1 flex-col gap-[7px] rounded-md px-2 py-[11px] text-left hover:bg-surface-2"
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
                {record && <JobBadge recordId={record.id} />}
                <SrOnly>, show in Gantt</SrOnly>
              </button>
              {record && (
                <IconButton
                  icon="bot"
                  label={`Delegate “${p.name}” to an agent`}
                  tip="Delegate to an agent"
                  onClick={() => open('delegate', delegateTarget('projects', record.id))}
                  className="mt-1.5 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
                />
              )}
            </li>
          );
        })}
        {!list.length && <Empty>All projects are completed.</Empty>}
      </ul>
    </Card>
  );
}
