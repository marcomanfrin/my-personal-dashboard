import { useDraggable } from '@dnd-kit/core';
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

/** The card face, shared by the list item and the drag preview. */
export function KanbanCardBody({ task: t }: { task: Task }) {
  const { now } = useDashboard();
  const done = t.column === 'done';
  return (
    <>
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
    </>
  );
}

/** Shared description for every card, rendered once by the board. */
export const DRAG_HINT_ID = 'kanban-drag-hint';

export const cardFace = 'flex w-full flex-col gap-1.5 rounded-md border border-line bg-surface-2 px-3 py-[11px] text-left';

/**
 * A draggable card: drag it onto another column to move it, click it for details.
 * The drawer's "Move to" buttons are the keyboard and single-tap alternative.
 */
export function KanbanCard({ task: t, wasDragged }: { task: Task; wasDragged: () => boolean }) {
  const { open } = useDrawer();
  const { setNodeRef, listeners, isDragging } = useDraggable({ id: t.id, data: { column: t.column } });
  return (
    <li ref={setNodeRef}>
      <button
        type="button"
        // Only the pointer listeners: the button keeps its own role and focus, and
        // dropping a card back on itself must not open the drawer.
        {...listeners}
        onClick={() => {
          if (!wasDragged()) open('task', t.id);
        }}
        aria-describedby={DRAG_HINT_ID}
        data-card={t.id}
        className={cn(
          cardFace,
          'cursor-grab hover:border-line-strong active:cursor-grabbing @min-[620px]/kb:bg-surface',
          isDragging && 'border-dashed border-line-strong opacity-40',
        )}
      >
        <KanbanCardBody task={t} />
      </button>
    </li>
  );
}
