import { clamp, ganttStatus, ms, type GanttTask } from '@argus/shared';
import { Kv, Pill, ProgressBar } from '../../components/ui/primitives';
import { DrawerView } from '../../drawer/DrawerShell';
import { useDashboard } from '../../hooks/useDashboard';
import { fmtLong } from '../../lib/format';
import { STATUS_LABEL } from '../../lib/labels';

export function GanttDrawer({ task: t }: { task: GanttTask }) {
  const { data, now } = useDashboard();
  const project = data.projects.find((p) => p.key === t.projectKey);
  const st = ganttStatus(t, now);
  const expected = Math.round(clamp((now.getTime() - ms(t.start)) / (ms(t.end) - ms(t.start) || 1), 0, 1) * 100);
  const byKey = new Map(data.gantt.map((x) => [x.key, x]));
  const deps = t.dependsOn.map((k) => byKey.get(k)).filter((x) => !!x);
  const blocks = data.gantt.filter((x) => x.dependsOn.includes(t.key));
  const lines = (items: string[]) =>
    items.map((s) => (
      <span key={s} className="block">
        {s}
      </span>
    ));

  return (
    <DrawerView
      kickerIcon="gantt"
      kicker={`${t.key}, ${project?.name ?? t.projectKey}${t.tags.length ? `, ${t.tags.join(', ')}` : ''}`}
      title={t.title}
    >
      <Kv
        rows={[
          ['Status', <Pill className={`st-${st}`}>{STATUS_LABEL[st]}</Pill>],
          [
            'Progress',
            <>
              {t.progress}% <span className="text-fg-3">({expected}% expected by today)</span>
            </>,
          ],
          ['Start', fmtLong(t.start)],
          ['End', fmtLong(t.end)],
          !!t.deadline && ['Deadline', fmtLong(t.deadline)],
          deps.length > 0 && ['Depends on', lines(deps.map((d) => `${d.title} (${d.progress}%)`))],
          blocks.length > 0 && ['Blocks', lines(blocks.map((d) => d.title))],
          !!project && ['Project owner', project.owner],
        ]}
      />
      <div className={`st-${st}`}>
        <ProgressBar value={t.progress} height="h-2" />
      </div>
    </DrawerView>
  );
}
