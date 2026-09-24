import { ms, reminderState, type ReminderState } from '@argus/shared';
import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Empty, Toggle } from '../../components/ui/primitives';
import { useDashboard } from '../../hooks/useDashboard';
import { AddReminderForm } from './AddReminderForm';
import { ReminderRow } from './ReminderRow';

const ORDER: Record<ReminderState, number> = { overdue: 0, today: 1, upcoming: 2, done: 3 };

export function RemindersCard({ className }: { className?: string }) {
  const { data, now } = useDashboard();
  const [showDone, setShowDone] = useState(false);

  const list = data.reminders
    .filter((r) => showDone || !r.done)
    .sort((a, b) => ORDER[reminderState(a, now)] - ORDER[reminderState(b, now)] || ms(a.due) - ms(b.due));
  const open = data.reminders.filter((r) => !r.done);
  const overdue = open.filter((r) => reminderState(r, now) === 'overdue').length;

  return (
    <Card
      id="reminders"
      title="Reminders"
      icon="checkSquare"
      className={className}
      sub={
        <>
          <b>{open.length}</b> open
          {overdue > 0 && (
            <>
              , <b className="text-crit!">{overdue} overdue</b>
            </>
          )}
        </>
      }
      tools={
        <Toggle checked={showDone} onChange={setShowDone}>
          Done
        </Toggle>
      }
    >
      <ul className="flex flex-col">
        {list.map((r) => (
          <ReminderRow key={r.id} reminder={r} />
        ))}
        {!list.length && <Empty>All done. Add the next thing below.</Empty>}
      </ul>
      <AddReminderForm />
    </Card>
  );
}
