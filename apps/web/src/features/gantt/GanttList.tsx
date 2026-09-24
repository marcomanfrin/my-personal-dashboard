import { ganttStatus } from '@command/shared';
import { Icon } from '../../components/ui/Icon';
import { Pill, ProgressBar } from '../../components/ui/primitives';
import { useDrawer } from '../../drawer/DrawerContext';
import { useDashboard } from '../../hooks/useDashboard';
import { cn } from '../../lib/cn';
import { fmtShort } from '../../lib/format';
import { STATUS_LABEL } from '../../lib/labels';
import { ganttWindow } from './geometry';
import type { GanttGroup } from './types';

/** Compact view: one card per task with a mini range track. Good on phones. */
export function GanttList({ groups }: { groups: GanttGroup[] }) {
  const { data, now } = useDashboard();
  const { open } = useDrawer();
  const win = ganttWindow(
    groups.flatMap((g) => g.tasks),
    now,
  );
  const byKey = new Map(data.gantt.map((t) => [t.key, t]));

  return (
    <ul className="flex flex-col gap-2">
      {groups.flatMap((g) =>
        g.tasks.map((t) => {
          const st = ganttStatus(t, now);
          const deps = t.dependsOn.map((k) => byKey.get(k)).filter((x) => !!x);
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => open('gantt', t.id)}
                className={cn(
                  'flex w-full flex-col gap-2 rounded-[13px] border border-line bg-surface-2 p-3 text-left',
                  `st-${st}`,
                )}
              >
                <span className="flex items-start justify-between gap-2">
                  <span>
                    <span className="text-xs font-bold text-fg-3">
                      {t.key}, {g.project.name}
                    </span>
                    <span className="block text-[14.5px] leading-[1.3] font-bold">{t.title}</span>
                  </span>
                  <Pill className={`st-${st}`}>{STATUS_LABEL[st]}</Pill>
                </span>
                <span className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 text-xs font-bold text-fg-2">
                  <span>{fmtShort(t.start)}</span>
                  <span
                    aria-hidden="true"
                    className="relative h-2.5 before:absolute before:inset-x-0 before:top-1 before:h-0.5 before:rounded-sm before:bg-line-strong before:content-['']"
                  >
                    <span
                      className="absolute top-0.5 h-1.5 rounded bg-c"
                      style={{ left: `${win.pos(t.start)}%`, width: `${win.pos(t.end) - win.pos(t.start)}%` }}
                    />
                    <span
                      className="absolute -top-0.5 -ml-px h-3.5 w-0.5 rounded-sm bg-accent"
                      style={{ left: `${win.pos(now)}%` }}
                    />
                  </span>
                  <span>{fmtShort(t.end)}</span>
                </span>
                <span className="flex items-center gap-2.5">
                  <ProgressBar value={t.progress} className="flex-1" height="h-2" />
                  <b className="text-[13px]">{t.progress}%</b>
                </span>
                {deps.length > 0 && (
                  <span className="flex items-center gap-[5px] text-xs text-fg-3">
                    <Icon name="link" size="xs" />
                    After {deps.map((d) => d.title).join(', ')}
                  </span>
                )}
              </button>
            </li>
          );
        }),
      )}
    </ul>
  );
}
