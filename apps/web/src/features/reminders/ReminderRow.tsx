import { reminderState, type Reminder } from '@argus/shared';
import { Lamp, lvl } from '../../components/ui/primitives';
import { Tag } from '../../components/ui/primitives';
import { useActions } from '../../hooks/useActions';
import { useDashboard } from '../../hooks/useDashboard';
import { cn } from '../../lib/cn';
import { dueText } from '../../lib/format';
import { LEVEL_LABEL } from '../../lib/labels';

export function ReminderRow({ reminder: r }: { reminder: Reminder }) {
  const { now } = useDashboard();
  const { toggleReminder } = useActions();
  const st = reminderState(r, now);
  const text = dueText(r.due, r.hasTime, now);
  const due = st === 'overdue' ? `Overdue, ${text.toLowerCase()}` : text;
  const inputId = `rem-${r.id}`;

  return (
    <li className="flex items-center gap-3 rounded-[10px] px-1.5 py-[9px] hover:bg-surface-2 [&+&]:border-t [&+&]:border-line">
      <input type="checkbox" className="check" id={inputId} checked={r.done} onChange={() => toggleReminder(r.id)} />
      <div className="min-w-0 flex-1">
        <label
          htmlFor={inputId}
          className={cn('block cursor-pointer text-sm leading-[1.35] font-semibold', r.done && 'text-fg-3 line-through')}
        >
          {r.title}
        </label>
        <div className="mt-0.5 flex flex-wrap items-center gap-2.5">
          <span
            className={cn(
              'text-[12.5px] font-bold whitespace-nowrap',
              r.done ? 'text-fg-3' : st === 'overdue' ? 'text-crit' : st === 'today' ? 'text-accent-text' : 'text-fg-2',
            )}
          >
            {due}
          </span>
          <Tag>{r.category}</Tag>
        </div>
      </div>
      {r.priority !== 'normal' && !r.done && (
        <span data-tip={`${LEVEL_LABEL[r.priority]} priority`} className={lvl(r.priority)}>
          <Lamp label={`${LEVEL_LABEL[r.priority]} priority`} />
        </span>
      )}
    </li>
  );
}
