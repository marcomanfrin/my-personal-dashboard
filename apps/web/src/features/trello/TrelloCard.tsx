import {
  DndContext,
  DragOverlay,
  MouseSensor,
  pointerWithin,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { TaskColumn, type Task } from '@command/shared';
import { useRef, useState, type ReactNode } from 'react';
import { Card } from '../../components/ui/Card';
import { Empty, Segmented } from '../../components/ui/primitives';
import { useActions } from '../../hooks/useActions';
import { useDashboard } from '../../hooks/useDashboard';
import { cn } from '../../lib/cn';
import { COLUMNS } from '../../lib/labels';
import { cardFace, DRAG_HINT_ID, KanbanCard, KanbanCardBody } from './KanbanCard';

/** A click this soon after a drop belongs to the drag, not to the card. */
const CLICK_AFTER_DROP_MS = 150;

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const columnLabel = (id: unknown) => COLUMNS.find((c) => c.id === id)?.label ?? String(id);

/** Drop target ids: the column itself, or its tab in the narrow one-column layout. */
const tabDropId = (c: TaskColumn) => `tab:${c}`;
const columnOf = (overId: string | number): TaskColumn | null => {
  const parsed = TaskColumn.safeParse(String(overId).replace(/^tab:/, ''));
  return parsed.success ? parsed.data : null;
};

/**
 * Kanban. Sized by its own width (container query), not the viewport: one
 * column with tabs when narrow, four side by side from 620px. Cards are dragged
 * between columns (mouse, or long-press on touch); a move is saved like any
 * other user action and queued for the Trello agent to apply on the real board.
 */
export function TrelloCard({ className }: { className?: string }) {
  const { data } = useDashboard();
  const { moveTask } = useActions();
  const [col, setCol] = useState<TaskColumn>('doing');
  const [dragging, setDragging] = useState<Task | null>(null);
  const droppedAt = useRef(0);
  const open = data.tasks.filter((t) => t.column !== 'done').length;

  const sensors = useSensors(
    // A few pixels of travel before a drag starts, so a click still opens the card.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Long-press on touch, so swiping still scrolls the page.
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  const titleOf = (id: string | number) => data.tasks.find((t) => t.id === id)?.title ?? 'Card';
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${titleOf(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over ? `${titleOf(active.id)} is over ${columnLabel(columnOf(over.id))}.` : `${titleOf(active.id)} is not over a column.`,
    onDragEnd: ({ active, over }) =>
      over ? `${titleOf(active.id)} dropped in ${columnLabel(columnOf(over.id))}.` : `${titleOf(active.id)} was not moved.`,
    onDragCancel: ({ active }) => `Moving ${titleOf(active.id)} was cancelled.`,
  };

  const onDragStart = ({ active }: DragStartEvent) => setDragging(data.tasks.find((t) => t.id === active.id) ?? null);
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(null);
    droppedAt.current = Date.now();
    const to = over ? columnOf(over.id) : null;
    if (!to || to === active.data.current?.column) return;
    moveTask(String(active.id), to);
    // Narrow layout: follow the card to the tab it was dropped on.
    setCol(to);
  };

  return (
    <Card id="trello" title="Trello tasks" icon="kanban" className={className} sub={<><b>{open}</b> open cards</>}>
      <span id={DRAG_HINT_ID} className="sr-only">
        Drag to another column to move it, or open the card for move options.
      </span>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        accessibility={{ announcements }}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setDragging(null)}
      >
        <div className="@container/kb">
          {/* Narrow layout: tabs to browse; while dragging, the same row becomes the drop targets. */}
          {dragging ? (
            <div className="mb-3 grid grid-cols-4 gap-1.5 @min-[620px]/kb:hidden" aria-hidden="true">
              {COLUMNS.map((c) => (
                <TabDrop key={c.id} column={c.id} current={c.id === dragging.column}>
                  {c.short}
                </TabDrop>
              ))}
            </div>
          ) : (
            <Segmented
              label="Kanban column"
              value={col}
              onChange={setCol}
              className="mb-3 flex w-full @min-[620px]/kb:hidden"
              buttonClassName="min-w-0 flex-1 truncate px-1"
              options={COLUMNS.map((c) => ({
                id: c.id,
                label: c.short,
                count: data.tasks.filter((t) => t.column === c.id).length,
              }))}
            />
          )}
          <div className="grid grid-cols-1 gap-3 @min-[620px]/kb:grid-cols-4">
            {COLUMNS.map((c) => (
              <Column
                key={c.id}
                column={c.id}
                label={c.label}
                visible={c.id === col}
                tasks={data.tasks.filter((t) => t.column === c.id)}
                wasDragged={() => Date.now() - droppedAt.current < CLICK_AFTER_DROP_MS}
                dropTarget={!!dragging && dragging.column !== c.id}
              />
            ))}
          </div>
        </div>
        <DragOverlay dropAnimation={prefersReducedMotion() ? null : undefined}>
          {dragging && (
            <div className={cn(cardFace, 'rotate-[1.5deg] cursor-grabbing border-line-strong bg-surface shadow-pop')}>
              <KanbanCardBody task={dragging} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </Card>
  );
}

function Column({
  column,
  label,
  visible,
  tasks,
  wasDragged,
  dropTarget,
}: {
  column: TaskColumn;
  label: string;
  /** The selected tab in the narrow layout; all columns show from 620px. */
  visible: boolean;
  tasks: Task[];
  wasDragged: () => boolean;
  /** A card from another column is being dragged: hint that this column accepts it. */
  dropTarget: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column });
  return (
    <section
      ref={setNodeRef}
      aria-label={label}
      className={cn(
        visible ? 'block' : 'hidden',
        'rounded-[14px] transition-[background-color,border-color,box-shadow] duration-150',
        '@min-[620px]/kb:flex @min-[620px]/kb:flex-col @min-[620px]/kb:border @min-[620px]/kb:border-line @min-[620px]/kb:bg-surface-2/50 @min-[620px]/kb:p-2.5',
        dropTarget && '@min-[620px]/kb:border-dashed @min-[620px]/kb:border-line-strong',
        isOver &&
          dropTarget &&
          'bg-accent-soft shadow-[0_0_0_2px_var(--accent)] @min-[620px]/kb:border-solid @min-[620px]/kb:border-accent @min-[620px]/kb:bg-accent-soft',
      )}
    >
      <h3 className="hidden items-center justify-between px-1 pt-0.5 pb-2 text-[12.5px] font-[750] text-fg-2 @min-[620px]/kb:flex">
        {label} <span className="text-fg-3">{tasks.length}</span>
      </h3>
      {/* min-h keeps an empty column easy to drop on. */}
      <ul className="flex min-h-12 flex-1 flex-col gap-2">
        {tasks.map((t) => (
          <KanbanCard key={t.id} task={t} wasDragged={wasDragged} />
        ))}
        {!tasks.length && <Empty>Empty</Empty>}
      </ul>
    </section>
  );
}

/** A column tab as a drop target, shown instead of the tabs while dragging in the narrow layout. */
function TabDrop({ column, current, children }: { column: TaskColumn; current: boolean; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: tabDropId(column), disabled: current });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'grid h-10 place-items-center rounded-[10px] border border-dashed text-[12.5px] font-bold transition-colors duration-150',
        current ? 'border-line text-fg-3' : 'border-line-strong text-fg-2',
        isOver && !current && 'border-solid border-accent bg-accent-soft text-accent-text',
      )}
    >
      {children}
    </div>
  );
}
