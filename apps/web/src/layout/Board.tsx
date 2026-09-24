import { useState } from 'react';
import { Button } from '../components/ui/primitives';
import { Icon } from '../components/ui/Icon';
import { spanClass, useBoardLayout } from './boardLayout';
import { BoardEditor } from './BoardEditor';
import { useSections } from './sections';

/**
 * The board: one column on phones, two from 768px, a 12-column grid from 1200px,
 * in the user's order and widths. `dense` fills the gaps; widgets side by side
 * share the row height, so each row reads as one aligned band.
 */
export function Board() {
  const { widgets, visible, move, resize, toggleHidden, reset, isDefault } = useBoardLayout();
  const collapsibleIds = visible.filter((w) => w.collapsible).map((w) => w.id);
  const [editing, setEditing] = useState(false);

  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto max-w-[1680px] px-3 pt-3.5 pb-[calc(var(--bottomnav-h)+28px)] outline-none xs:px-4 md:px-7 md:pt-[18px] md:pb-12"
    >
      <BoardToolbar
        editing={editing}
        setEditing={setEditing}
        reset={reset}
        isDefault={isDefault}
        collapsibleIds={collapsibleIds}
      />
      {editing ? (
        <BoardEditor widgets={widgets} move={move} resize={resize} toggleHidden={toggleHidden} />
      ) : !visible.length ? (
        <div className="grid place-items-center rounded-lg border border-dashed border-line-strong px-4 py-16 text-center">
          <Icon name="eyeOff" className="text-fg-3" />
          <p className="mt-2 text-sm font-semibold text-fg-2">Every widget is hidden. Use Customize to show them again.</p>
        </div>
      ) : (
        <div className="grid grid-flow-row-dense grid-cols-1 gap-3.5 md:grid-cols-2 md:gap-[18px] xl:grid-cols-12 [&>*]:min-w-0">
          {visible.map(({ id, Component, span, wide }) => (
            <Component key={id} className={spanClass(span, wide)} />
          ))}
        </div>
      )}
    </main>
  );
}

function BoardToolbar({
  editing,
  setEditing,
  reset,
  isDefault,
  collapsibleIds,
}: {
  editing: boolean;
  setEditing: (v: boolean) => void;
  reset: () => void;
  isDefault: boolean;
  /** The visible widgets that can collapse: hidden ones do not count. */
  collapsibleIds: string[];
}) {
  const { collapsed, setAll } = useSections();
  const allCollapsed = collapsibleIds.length > 0 && collapsibleIds.every((id) => collapsed[id]);

  return (
    <div className="mb-3 flex flex-wrap items-center justify-end gap-2 md:mb-3.5">
      {editing ? (
        <>
          <p className="mr-auto text-[13px] font-semibold text-fg-2" role="status">
            Drag the widgets, or use their arrows, to rearrange the board; the eye hides or shows one. Widths apply on
            wide screens.
          </p>
          <Button size="sm" icon="refresh" disabled={isDefault} onClick={reset}>
            Reset layout
          </Button>
          <Button size="sm" variant="primary" icon="check" onClick={() => setEditing(false)}>
            Done
          </Button>
        </>
      ) : (
        <>
          <Button
            size="sm"
            icon={allCollapsed ? 'expandAll' : 'collapseAll'}
            disabled={!collapsibleIds.length}
            onClick={() => setAll(collapsibleIds, !allCollapsed)}
          >
            {allCollapsed ? 'Expand all' : 'Collapse all'}
          </Button>
          <Button size="sm" icon="layout" onClick={() => setEditing(true)}>
            Customize
          </Button>
        </>
      )}
    </div>
  );
}
