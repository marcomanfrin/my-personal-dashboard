import { ms, type CalendarEvent } from '@command/shared';
import { Icon } from '../../components/ui/Icon';
import { ProgressBar, SrOnly, Tag } from '../../components/ui/primitives';
import { useDrawer } from '../../drawer/DrawerContext';
import { useDashboard } from '../../hooks/useDashboard';
import { cn } from '../../lib/cn';
import { fmtDuration, fmtTime } from '../../lib/format';
import { CAT_LABEL } from '../../lib/labels';

export type EventState = 'past' | 'now' | 'next' | 'later';

/** One stop on the day timeline: time, rail dot, and the event card. */
export function EventItem({ event: e, state }: { event: CalendarEvent; state: EventState }) {
  const { now } = useDashboard();
  const { open } = useDrawer();
  const n = now.getTime();
  const start = ms(e.start);
  const end = ms(e.end);
  const pct = state === 'now' ? Math.round(((n - start) / (end - start)) * 100) : 0;
  const note =
    state === 'now'
      ? `Ends ${fmtTime(e.end)}, ${fmtDuration(end - n)} left`
      : state === 'next'
        ? `Starts in ${fmtDuration(start - n)}`
        : '';

  return (
    <li className={cn('group/tl grid grid-cols-[48px_18px_minmax(0,1fr)] gap-x-2', state === 'past' && 'opacity-50')}>
      <div className="pt-[11px] text-right text-[13.5px] leading-[1.2] font-bold">
        {fmtTime(e.start)}
        <small className="block text-[11.5px] font-semibold text-fg-3">{fmtDuration(end - start)}</small>
      </div>
      <div
        className={cn(
          'relative flex justify-center',
          'before:absolute before:top-0 before:bottom-0 before:w-0.5 before:bg-line before:content-[""]',
          'group-first/tl:before:top-4 group-last/tl:before:bottom-[calc(100%-16px)]',
        )}
      >
        <span
          className={cn(
            'relative mt-3.5 size-2.5 rounded-full border-2',
            `cat-${e.category}`,
            state === 'past' && 'border-transparent bg-line-strong',
            state === 'now' && 'border-accent bg-accent shadow-[0_0_0_4px_var(--accent-soft)]',
            state === 'next' && 'border-accent bg-surface',
            state === 'later' && 'border-c bg-surface',
          )}
        />
      </div>
      <button
        type="button"
        onClick={() => open('event', e.id)}
        className={cn(
          'my-1 block w-full rounded-[11px] border border-transparent px-2.5 py-[7px] text-left hover:bg-surface-2',
          state === 'now' && 'border-accent/35 bg-accent-soft',
          state === 'next' && 'border-line-strong',
        )}
      >
        <span className="flex items-center gap-1.5 text-sm leading-[1.35] font-[650]">
          {e.title}
          {e.important && (
            <>
              <span data-tip="Important" className="text-high">
                <Icon name="flag" size="xs" />
              </span>
              <SrOnly>Important</SrOnly>
            </>
          )}
        </span>
        <span className="mt-[3px] flex flex-wrap gap-x-3 gap-y-1">
          <Tag swatch className={`cat-${e.category}`}>
            {CAT_LABEL[e.category]}
          </Tag>
          {e.videoLink ? <Tag icon="video">{e.videoLink}</Tag> : e.location ? <Tag icon="pin">{e.location}</Tag> : null}
        </span>
        {state === 'now' && <ProgressBar value={pct} label="Meeting progress" className="mt-2" />}
        {note && <span className="mt-1.5 block text-[12.5px] font-bold text-accent-text">{note}</span>}
      </button>
    </li>
  );
}
