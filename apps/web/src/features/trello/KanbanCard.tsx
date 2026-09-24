import { dayDiff, type Task } from '@command/shared';
import { Tag } from '../../components/ui/primitives';
import { useDrawer } from '../../drawer/DrawerContext';
import { useDashboard } from '../../hooks/useDashboard';
import { cn } from '../../lib/cn';
import { dueText } from '../../lib/format';

export function TaskLabel({ label }: { label: string }) {
  return (
    <span className={cn('rounded-full bg-c/13 px-[7px] py-0.5 text-[11px] font-[750] text-c', `lbl-${label}`)}>{label}</span>
  );
}

export function KanbanCard({ task: t }: { task: Task }) {
  const { now } = useDashboard();
  const { open } = useDrawer();
  const done = t.column === 'done';
  return (
    <li>
      <button
        type="button"
        onClick={() => open('task', t.id)}
        className="flex w-full flex-col gap-1.5 rounded-md border border-line bg-surface-2 px-3 py-[11px] text-left hover:border-line-strong @min-[620px]/kb:bg-surface"
      >
        <span className="flex flex-wrap items-center gap-2.5">
          {t.labels.map((l) => (
            <TaskLabel key={l} label={l} />
          ))}
          <Tag>{t.board}</Tag>
        </span>
        <span className={cn('text-[13.5px] leading-[1.35] font-[650]', done && 'text-fg-3 line-through')}>{t.title}</span>
        {(t.due || t.checklist) && (
          <span className="flex flex-wrap items-center gap-2.5">
            {t.due && !done && (
              <Tag icon="clock" className={dayDiff(t.due, now) <= 1 ? 'text-high' : undefined}>
                {dueText(t.due, false, now)}
              </Tag>
            )}
            {t.checklist && (
              <Tag icon="checkSquare">
                {t.checklist.done}/{t.checklist.total}
              </Tag>
            )}
          </span>
        )}
      </button>
    </li>
  );
}
