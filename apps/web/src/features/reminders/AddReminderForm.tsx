import { addDays, startOfDay } from '@command/shared';
import { useRef, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/primitives';
import { useActions } from '../../hooks/useActions';

type When = 'today' | 'tomorrow' | 'week';
const OFFSET: Record<When, number> = { today: 0, tomorrow: 1, week: 6 };

/** End of the chosen day: reminders added here have a date, not a time. */
const dueFor = (when: When) => {
  const d = addDays(startOfDay(new Date()), OFFSET[when]);
  d.setHours(23, 59, 0, 0);
  return d.toISOString();
};

export function AddReminderForm() {
  const { addReminder } = useActions();
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState<When>('today');
  const input = useRef<HTMLInputElement>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    addReminder({ title: t, due: dueFor(when), hasTime: false, priority: 'normal', category: 'Inbox' });
    setTitle('');
    input.current?.focus();
  };

  return (
    <form onSubmit={submit} className="mt-3 flex gap-2 max-[380px]:flex-wrap">
      <label className="sr-only" htmlFor="rem-new">
        New reminder
      </label>
      <input
        ref={input}
        id="rem-new"
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a reminder"
        autoComplete="off"
        required
        maxLength={120}
        className="h-[38px] min-w-0 flex-1 rounded-[10px] border border-line bg-surface-2 px-3 outline-0 focus:border-accent/60 focus:shadow-[0_0_0_3px_var(--accent-soft)] max-[380px]:basis-full"
      />
      <label className="sr-only" htmlFor="rem-when">
        When
      </label>
      <select
        id="rem-when"
        className="select h-[38px] max-[380px]:flex-1"
        value={when}
        onChange={(e) => setWhen(e.target.value as When)}
      >
        <option value="today">Today</option>
        <option value="tomorrow">Tomorrow</option>
        <option value="week">Next week</option>
      </select>
      <Button type="submit" variant="primary" icon="plus" className="max-[380px]:flex-1">
        Add
      </Button>
    </form>
  );
}
