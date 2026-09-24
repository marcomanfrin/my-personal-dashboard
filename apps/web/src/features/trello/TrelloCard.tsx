import {
  DndContext,
  DragOverlay,
  MouseSensor,
  pointerWithin,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type Active,
  type Announcements,
  type DragEndEvent,
  type DragMoveEvent,
  type DropAnimation,
  type DragStartEvent,
  type Over,
} from '@dnd-kit/core';
import { sortByPosition, TaskColumn, type Task } from '@argus/shared';
import { Fragment, useMemo, useRef, useState, type ReactNode } from 'react';
import { Card } from '../../components/ui/Card';
import { Empty, Segmented } from '../../components/ui/primitives';
import { useActions } from '../../hooks/useActions';
import { useDashboard } from '../../hooks/useDashboard';
import { cn } from '../../lib/cn';
import { COLUMNS } from '../../lib/labels';
import { cardFace, DRAG_HINT_ID, KanbanCard, KanbanCardBody } from './KanbanCard';
import { RETURN_EASE, RETURN_MS, untiltOnReturn, useCardFlip } from './useCardFlip';

/** A click this soon after a drop belongs to the drag, not to the card. */
const CLICK_AFTER_DROP_MS = 150;

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const columnLabel = (id: TaskColumn) => COLUMNS.find((c) => c.id === id)!.label;

/** Drop target ids: the column itself, or its tab in the narrow one-column layout. */
const tabDropId = (c: TaskColumn) => `tab:${c}`;
const columnOf = (overId: string | number): TaskColumn | null => {
  const parsed = TaskColumn.safeParse(String(overId).replace(/^tab:/, ''));
  return parsed.success ? parsed.data : null;
};

/** Where a dragged card would land: `index` counts the column's cards without the dragged one. */
interface DropAt {
  column: TaskColumn;
  index: number;
}

/** A drag that did not move the card: the preview glides back and untilts, the card stays hidden until it lands. */
const returnAnimation: DropAnimation = {
  duration: RETURN_MS,
  easing: RETURN_EASE,
  sideEffects: ({ active, dragOverlay }) => {
    active.node.style.opacity = '0';
    untiltOnReturn(dragOverlay.node);
    return () => {
      active.node.style.opacity = '';
    };
  },
};

/**
 * Kanban. Sized by its own width (container query), not the viewport: one
 * column with tabs when narrow, four side by side from 620px. Cards are dragged
 * between columns and within one (mouse, or long-press on touch); a line shows
 * where the card will go. A move is saved like any other user action (column +
 * position) and queued for the Trello agent to apply on the real board.
 */
export function TrelloCard({ className }: { className?: string }) {
  const { data } = useDashboard();
  const { moveTask } = useActions();
  const [col, setCol] = useState<TaskColumn>('doing');
  const [dragging, setDragging] = useState<Task | null>(null);
  const [dropAt, setDropAt] = useState<DropAt | null>(null);
  /** Mirrors `dropAt` for the drag handlers, which run before a re-render. */
  const dropRef = useRef<DropAt | null>(null);
  /** The last drop moved the card: it lands in its new place (FLIP), so the preview must not fly back. */
  const [landed, setLanded] = useState(false);
  const droppedAt = useRef(0);
  const board = useRef<HTMLDivElement>(null);

  const columns = useMemo(
    () =>
      Object.fromEntries(COLUMNS.map((c) => [c.id, sortByPosition(data.tasks.filter((t) => t.column === c.id))])) as Record<
        TaskColumn,
        Task[]
      >,
    [data.tasks],
  );
  const flip = useCardFlip(
    board,
    COLUMNS.flatMap((c) => columns[c.id].map((t) => `${t.id}:${c.id}`)).join(','),
  );
  const open = data.tasks.filter((t) => t.column !== 'done').length;

  const sensors = useSensors(
    // A few pixels of travel before a drag starts, so a click still opens the card.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Long-press on touch, so swiping still scrolls the page.
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  /** Index in the dragged-from column, counted the same way as `DropAt.index`. */
  const indexOf = (t: Task) => columns[t.column].findIndex((x) => x.id === t.id);
  /** A drop that would leave the card where it is. */
  const isNoop = (d: DropAt | null, t: Task | null) => !d || !t || (d.column === t.column && d.index === indexOf(t));

  /** The insertion point under the dragged card: the cards above its centre come before it. */
  const dropFor = (active: Active, over: Over | null): DropAt | null => {
    const column = over ? columnOf(over.id) : null;
    if (!column) return null;
    const others = columns[column].filter((t) => t.id !== active.id);
    // A tab has no cards to aim between: the end of that column.
    if (String(over!.id).startsWith('tab:')) return { column, index: others.length };
    const rect = active.rect.current.translated;
    const section = board.current?.querySelector(`[data-column="${column}"]`);
    if (!rect || !section) return { column, index: others.length };
    const centre = rect.top + rect.height / 2;
    let index = 0;
    for (const t of others) {
      const el = section.querySelector(`[data-card="${t.id}"]`);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.top + r.height / 2 < centre) index++;
    }
    return { column, index };
  };

  const updateDrop = ({ active, over }: DragMoveEvent) => {
    const next = dropFor(active, over);
    const prev = dropRef.current;
    if (prev?.column === next?.column && prev?.index === next?.index) return;
    dropRef.current = next;
    setDropAt(next);
  };

  const titleOf = (id: string | number) => data.tasks.find((t) => t.id === id)?.title ?? 'Card';
  const whereText = (d: DropAt) => `${columnLabel(d.column)}, position ${d.index + 1}`;
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${titleOf(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over && columnOf(over.id)
        ? `${titleOf(active.id)} is over ${columnLabel(columnOf(over.id)!)}.`
        : `${titleOf(active.id)} is not over a column.`,
    onDragEnd: ({ active }) => {
      const d = dropRef.current;
      const t = data.tasks.find((x) => x.id === active.id) ?? null;
      return isNoop(d, t) ? `${titleOf(active.id)} was not moved.` : `${titleOf(active.id)} moved to ${whereText(d!)}.`;
    },
    onDragCancel: ({ active }) => `Moving ${titleOf(active.id)} was cancelled.`,
  };

  const onDragStart = ({ active }: DragStartEvent) => {
    flip.refresh();
    setLanded(false);
    dropRef.current = null;
    setDropAt(null);
    setDragging(data.tasks.find((t) => t.id === active.id) ?? null);
  };
  const endDrag = () => {
    setDragging(null);
    setDropAt(null);
    droppedAt.current = Date.now();
  };
  const onDragEnd = ({ active }: DragEndEvent) => {
    const d = dropRef.current;
    const t = data.tasks.find((x) => x.id === active.id) ?? null;
    endDrag();
    if (isNoop(d, t)) return;
    const at = active.rect.current.translated;
    if (at) flip.landFrom(String(active.id), at);
    setLanded(true);
    moveTask(String(active.id), d!.column, d!.index);
    // Narrow layout: follow the card to the tab it was dropped on.
    setCol(d!.column);
  };

  /** The drop line to draw, only where it would change something. */
  const indicator = isNoop(dropAt, dragging) ? null : dropAt;

  return (
    <Card id="trello" title="Trello tasks" icon="kanban" className={className} sub={<><b>{open}</b> open cards</>}>
      <span id={DRAG_HINT_ID} className="sr-only">
        Drag to another column or position to move it, or open the card for move options.
      </span>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        accessibility={{ announcements }}
        onDragStart={onDragStart}
        onDragMove={updateDrop}
        onDragOver={updateDrop}
        onDragEnd={onDragEnd}
        onDragCancel={endDrag}
      >
        <div ref={board} className="@container/kb">
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
              options={COLUMNS.map((c) => ({ id: c.id, label: c.short, count: columns[c.id].length }))}
            />
          )}
          <div className="grid grid-cols-1 gap-3 @min-[620px]/kb:grid-cols-4">
            {COLUMNS.map((c) => (
              <Column
                key={c.id}
                column={c.id}
                label={c.label}
                visible={c.id === col}
                tasks={columns[c.id]}
                draggingId={dragging?.id ?? null}
                indicatorAt={indicator?.column === c.id ? indicator.index : null}
                wasDragged={() => Date.now() - droppedAt.current < CLICK_AFTER_DROP_MS}
                dropTarget={!!dragging && dragging.column !== c.id}
              />
            ))}
          </div>
        </div>
        <DragOverlay dropAnimation={landed || prefersReducedMotion() ? null : returnAnimation}>
          {dragging && (
            <div className={cn(cardFace, 'animate-lift cursor-grabbing border-line-strong bg-surface')}>
              <KanbanCardBody task={dragging} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </Card>
  );
}

/**
 * Where the card will be inserted. Its negative margins cancel the list gap it
 * adds, so showing it never shifts the cards around it.
 */
function DropLine() {
  return <li aria-hidden="true" className="relative z-10 -my-[5px] h-0.5 rounded-full bg-accent shadow-[0_0_0_3px_var(--accent-soft)]" />;
}

function Column({
  column,
  label,
  visible,
  tasks,
  draggingId,
  indicatorAt,
  wasDragged,
  dropTarget,
}: {
  column: TaskColumn;
  label: string;
  /** The selected tab in the narrow layout; all columns show from 620px. */
  visible: boolean;
  /** Sorted by position. */
  tasks: Task[];
  draggingId: string | null;
  /** Draw the drop line before the n-th card that is not the dragged one (n = count: at the end). */
  indicatorAt: number | null;
  wasDragged: () => boolean;
  /** A card from another column is being dragged: hint that this column accepts it. */
  dropTarget: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column });
  let n = 0;
  return (
    <section
      ref={setNodeRef}
      aria-label={label}
      data-column={column}
      className={cn(
        visible ? 'block' : 'hidden',
        'rounded-[14px] transition-[background-color,border-color,box-shadow] duration-150',
        '@min-[620px]/kb:flex @min-[620px]/kb:flex-col @min-[620px]/kb:border @min-[620px]/kb:border-line @min-[620px]/kb:bg-surface-2/50 @min-[620px]/kb:p-2.5',
        dropTarget && '@min-[620px]/kb:border-dashed @min-[620px]/kb:border-line-strong',
        isOver &&
          indicatorAt !== null &&
          '@min-[620px]/kb:border-solid @min-[620px]/kb:border-accent/60 @min-[620px]/kb:bg-[color-mix(in_srgb,var(--accent)_6%,var(--surface-2))]',
      )}
    >
      <h3 className="hidden items-center justify-between px-1 pt-0.5 pb-2 text-[12.5px] font-[750] text-fg-2 @min-[620px]/kb:flex">
        {label} <span className="text-fg-3">{tasks.length}</span>
      </h3>
      {/* min-h keeps an empty column easy to drop on. */}
      <ul className="flex min-h-12 flex-1 flex-col gap-2">
        {tasks.map((t) => {
          const line = t.id !== draggingId && n++ === indicatorAt;
          return (
            <Fragment key={t.id}>
              {line && <DropLine />}
              <KanbanCard task={t} wasDragged={wasDragged} />
            </Fragment>
          );
        })}
        {indicatorAt !== null && indicatorAt >= n && <DropLine />}
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
