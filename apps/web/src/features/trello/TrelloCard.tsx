import type { TaskColumn } from '@command/shared';
import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Empty, Segmented } from '../../components/ui/primitives';
import { useDashboard } from '../../hooks/useDashboard';
import { cn } from '../../lib/cn';
import { COLUMNS } from '../../lib/labels';
import { KanbanCard } from './KanbanCard';

/**
 * Kanban. Sized by its own width (container query), not the viewport: one
 * column with tabs when narrow, four side by side from 620px.
 */
export function TrelloCard({ className }: { className?: string }) {
  const { data } = useDashboard();
  const [col, setCol] = useState<TaskColumn>('doing');
  const open = data.tasks.filter((t) => t.column !== 'done').length;

  return (
    <Card id="trello" title="Trello tasks" icon="kanban" className={className} sub={<><b>{open}</b> open cards</>}>
      <div className="@container/kb">
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
        <div className="grid grid-cols-1 gap-3 @min-[620px]/kb:grid-cols-4">
          {COLUMNS.map((c) => {
            const tasks = data.tasks.filter((t) => t.column === c.id);
            return (
              <section
                key={c.id}
                aria-label={c.label}
                className={cn(
                  c.id === col ? 'block' : 'hidden',
                  '@min-[620px]/kb:flex @min-[620px]/kb:flex-col @min-[620px]/kb:rounded-[14px] @min-[620px]/kb:border @min-[620px]/kb:border-line @min-[620px]/kb:bg-surface-2/50 @min-[620px]/kb:p-2.5',
                )}
              >
                <h3 className="hidden items-center justify-between px-1 pt-0.5 pb-2 text-[12.5px] font-[750] text-fg-2 @min-[620px]/kb:flex">
                  {c.label} <span className="text-fg-3">{tasks.length}</span>
                </h3>
                <ul className="flex flex-col gap-2">
                  {tasks.map((t) => (
                    <KanbanCard key={t.id} task={t} />
                  ))}
                  {!tasks.length && <Empty>Empty</Empty>}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
