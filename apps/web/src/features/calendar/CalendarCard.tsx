import { dayDiff, ms, startOfDay, type CalendarEvent } from '@argus/shared';
import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Empty, Segmented } from '../../components/ui/primitives';
import { useDashboard } from '../../hooks/useDashboard';
import { dueText, fmtLong } from '../../lib/format';
import { EventItem, type EventState } from './EventItem';

type Tab = 'today' | 'upcoming';

export function CalendarCard({ className }: { className?: string }) {
  const { data, now } = useDashboard();
  const [tab, setTab] = useState<Tab>('today');
  const n = now.getTime();

  const sorted = [...data.events].sort((a, b) => ms(a.start) - ms(b.start));
  const today = sorted.filter((e) => dayDiff(e.start, now) === 0);
  const later = sorted.filter((e) => dayDiff(e.start, now) > 0 && dayDiff(e.start, now) <= 7);
  const nextAny = sorted.find((e) => ms(e.start) > n);
  const left = today.filter((e) => ms(e.end) > n).length;

  return (
    <Card
      id="calendar"
      sources={['events']}
      title="Calendar"
      icon="calendar"
      className={className}
      sub={left ? <><b>{left}</b> left today</> : 'Day is done'}
      tools={
        <Segmented
          label="Calendar range"
          value={tab}
          onChange={setTab}
          options={[
            { id: 'today', label: 'Today' },
            { id: 'upcoming', label: 'Next 7 days' },
          ]}
        />
      }
    >
      {tab === 'today' ? (
        <>
          {today.length > 0 && <TodayTimeline events={today} now={n} />}
          {!today.some((e) => ms(e.end) > n) && (
            <div className="mt-2.5 rounded-[11px] bg-surface-2 px-3 py-2.5 text-[13px] text-fg-2">
              Nothing left today.
              {nextAny && (
                <>
                  {' '}
                  Next: <b>{nextAny.title}</b>, {dueText(nextAny.start, true, now)}.
                </>
              )}
            </div>
          )}
        </>
      ) : (
        <Upcoming events={later} now={now} />
      )}
    </Card>
  );
}

function TodayTimeline({ events, now }: { events: CalendarEvent[]; now: number }) {
  const next = events.find((e) => ms(e.start) > now);
  const stateOf = (e: CalendarEvent): EventState =>
    ms(e.end) <= now ? 'past' : ms(e.start) <= now ? 'now' : e === next ? 'next' : 'later';
  return (
    <ol className="relative">
      {events.map((e) => (
        <EventItem key={e.id} event={e} state={stateOf(e)} />
      ))}
    </ol>
  );
}

function Upcoming({ events, now }: { events: CalendarEvent[]; now: Date }) {
  const groups = new Map<number, CalendarEvent[]>();
  for (const e of events) {
    const day = startOfDay(e.start).getTime();
    groups.set(day, [...(groups.get(day) ?? []), e]);
  }
  if (!groups.size) return <Empty as="p">No events in the next 7 days.</Empty>;
  return (
    <>
      {[...groups.values()].map((list) => (
        <div key={list[0]!.id}>
          <h3 className="pt-3 pb-1 text-[12.5px] font-[750] text-fg-2 first:pt-0">
            {dayDiff(list[0]!.start, now) === 1 ? 'Tomorrow' : fmtLong(list[0]!.start)}
          </h3>
          <ol className="relative">
            {list.map((e) => (
              <EventItem key={e.id} event={e} state="later" />
            ))}
          </ol>
        </div>
      ))}
    </>
  );
}
