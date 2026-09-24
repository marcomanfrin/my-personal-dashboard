import { sortByPosition, type Task } from '@command/shared';
import { Button, Kv } from '../../components/ui/primitives';
import { DrawerSection, DrawerView } from '../../drawer/DrawerShell';
import { useActions } from '../../hooks/useActions';
import { useDashboard } from '../../hooks/useDashboard';
import { dueText } from '../../lib/format';
import { COLUMNS } from '../../lib/labels';
import { TaskLabel } from './KanbanCard';

export function TaskDrawer({ task: t }: { task: Task }) {
  const { now, data } = useDashboard();
  const { moveTask } = useActions();
  const column = sortByPosition(data.tasks.filter((x) => x.column === t.column));
  const index = column.findIndex((x) => x.id === t.id);
  return (
    <DrawerView kickerIcon="kanban" kicker={`Trello, ${t.board}`} title={t.title}>
      <Kv
        rows={[
          !!t.due && ['Due', dueText(t.due, false, now)],
          !!t.checklist && ['Checklist', `${t.checklist.done} of ${t.checklist.total}`],
          [
            'Labels',
            <span className="flex flex-wrap gap-1">
              {t.labels.map((l) => (
                <TaskLabel key={l} label={l} />
              ))}
            </span>,
          ],
        ]}
      />
      <DrawerSection title={`Position in ${COLUMNS.find((c) => c.id === t.column)!.label}`}>
        <div className="flex items-center gap-2">
          <Button size="sm" disabled={index <= 0} onClick={() => moveTask(t.id, t.column, index - 1)}>
            Move up
          </Button>
          <Button size="sm" disabled={index >= column.length - 1} onClick={() => moveTask(t.id, t.column, index + 1)}>
            Move down
          </Button>
          <span className="text-[12.5px] font-semibold text-fg-3">
            {index + 1} of {column.length}
          </span>
        </div>
      </DrawerSection>
      <DrawerSection title="Move to">
        <div className="grid grid-cols-2 gap-2">
          {COLUMNS.map((c) => (
            <Button key={c.id} aria-pressed={t.column === c.id} onClick={() => c.id !== t.column && moveTask(t.id, c.id)}>
              {c.label}
            </Button>
          ))}
        </div>
      </DrawerSection>
    </DrawerView>
  );
}
