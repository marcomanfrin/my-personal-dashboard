import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from '@dnd-kit/core';
import { rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Icon } from '../components/ui/Icon';
import { IconButton, Segmented } from '../components/ui/primitives';
import { cn } from '../lib/cn';
import { SPAN_OPTIONS, spanClass, type PlacedWidget, type Span } from './boardLayout';

/**
 * The layout editor: every widget as a compact tile with its real width, so the
 * whole board fits on screen while rearranging. Drag a tile (mouse, long-press,
 * or Space then arrows), or use its arrow buttons; pick a width per tile.
 */
export function BoardEditor({
  widgets,
  move,
  resize,
}: {
  widgets: PlacedWidget[];
  move: (id: string, to: number) => void;
  resize: (id: string, span: Span) => void;
}) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const titleOf = (id: string | number) => widgets.find((w) => w.id === id)?.title ?? String(id);
  const indexOf = (id: string | number) => widgets.findIndex((w) => w.id === id);
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${titleOf(active.id)}, position ${indexOf(active.id) + 1} of ${widgets.length}.`,
    onDragOver: ({ active, over }) =>
      over ? `${titleOf(active.id)} is over position ${indexOf(over.id) + 1} of ${widgets.length}.` : '',
    onDragEnd: ({ active, over }) =>
      over ? `${titleOf(active.id)} dropped at position ${indexOf(over.id) + 1} of ${widgets.length}.` : `${titleOf(active.id)} was not moved.`,
    onDragCancel: ({ active }) => `Moving ${titleOf(active.id)} was cancelled.`,
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) move(String(active.id), indexOf(over.id));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable: 'To move a widget, press Space, use the arrow keys, then press Space again to drop it or Escape to cancel.',
        },
      }}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={widgets.map((w) => w.id)} strategy={rectSortingStrategy}>
        <ol
          aria-label="Dashboard layout"
          className="grid grid-flow-row-dense grid-cols-1 gap-3.5 md:grid-cols-2 md:gap-[18px] xl:grid-cols-12"
        >
          {widgets.map((w, i) => (
            <Tile
              key={w.id}
              widget={w}
              index={i}
              count={widgets.length}
              onMove={(to) => move(w.id, to)}
              onResize={(span) => resize(w.id, span)}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function Tile({
  widget: w,
  index,
  count,
  onMove,
  onResize,
}: {
  widget: PlacedWidget;
  index: number;
  count: number;
  onMove: (to: number) => void;
  onResize: (span: Span) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: w.id,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'min-w-0',
        spanClass(w.span, w.wide),
        isDragging && 'relative z-10',
      )}
    >
      <div
        className={cn(
          'flex min-h-[84px] flex-wrap items-center gap-2.5 rounded-lg border border-dashed border-line-strong bg-surface p-3 shadow-card transition-shadow',
          isDragging && 'border-solid border-accent shadow-pop',
        )}
      >
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Move ${w.title}, position ${index + 1} of ${count}`}
          className={cn(
            'grid size-10 flex-none cursor-grab touch-none place-items-center rounded-[10px] text-fg-2 hover:bg-surface-2 hover:text-fg active:cursor-grabbing',
          )}
        >
          <Icon name="grip" />
        </button>
        <span className="grid size-8 flex-none place-items-center rounded-[10px] border border-line bg-surface-2 text-fg-2">
          <Icon name={w.icon} />
        </span>
        <b className="min-w-0 flex-1 truncate text-[14.5px] font-[750]">{w.title}</b>
        <div className="ml-auto flex items-center gap-1.5">
          {/* Widths only apply from 1200px: hidden below, where the board is one or two columns. */}
          <Segmented
            label={`Width of ${w.title}`}
            value={String(w.span) as `${Span}`}
            onChange={(v) => onResize(Number(v) as Span)}
            className="hidden xl:inline-flex"
            options={SPAN_OPTIONS.map((o) => ({ id: String(o.span) as `${Span}`, label: o.label, hint: o.hint }))}
          />
          <IconButton icon="chevronLeft" label={`Move ${w.title} earlier`} disabled={index === 0} onClick={() => onMove(index - 1)} className="disabled:opacity-40" />
          <IconButton
            icon="chevronRight"
            label={`Move ${w.title} later`}
            disabled={index === count - 1}
            onClick={() => onMove(index + 1)}
            className="disabled:opacity-40"
          />
        </div>
      </div>
    </li>
  );
}
