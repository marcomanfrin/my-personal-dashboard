import type { Task } from '@command/shared';
import { Button, Kv } from '../../components/ui/primitives';
import { DrawerSection, DrawerView } from '../../drawer/DrawerShell';
import { useActions } from '../../hooks/useActions';
import { useDashboard } from '../../hooks/useDashboard';
import { dueText } from '../../lib/format';
import { COLUMNS } from '../../lib/labels';
import { TaskLabel } from './KanbanCard';

export function TaskDrawer({ task: t }: { task: Task }) {
  const { now } = useDashboard();
  const { moveTask } = useActions();
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
      <DrawerSection title="Move to">
        <div className="grid grid-cols-2 gap-2">
          {COLUMNS.map((c) => (
            <Button key={c.id} aria-pressed={t.column === c.id} onClick={() => moveTask(t.id, c.id)}>
              {c.label}
            </Button>
          ))}
        </div>
      </DrawerSection>
    </DrawerView>
  );
}
