import { ms, type CalendarEvent } from '@argus/shared';
import { Icon } from '../../components/ui/Icon';
import { Kv } from '../../components/ui/primitives';
import { DrawerView, Prose } from '../../drawer/DrawerShell';
import { useDashboard } from '../../hooks/useDashboard';
import { fmtDuration, fmtLong, fmtTime } from '../../lib/format';
import { CAT_LABEL } from '../../lib/labels';

export function EventDrawer({ event: e }: { event: CalendarEvent }) {
  const { now } = useDashboard();
  const canJoin = !!e.url && ms(e.end) > now.getTime();
  return (
    <DrawerView
      kickerIcon="calendar"
      kicker={`${CAT_LABEL[e.category]}${e.important ? ', important' : ''}`}
      title={e.title}
      foot={
        canJoin && (
          <a
            href={e.url!}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-[38px] items-center gap-[7px] rounded-[10px] border border-accent bg-accent px-3.5 text-[13.5px] font-bold text-on-accent hover:brightness-110"
          >
            <Icon name="video" size="sm" />
            Join call
          </a>
        )
      }
    >
      <Kv
        rows={[
          [
            'When',
            <>
              {fmtLong(e.start)}
              <br />
              {fmtTime(e.start)} to {fmtTime(e.end)} ({fmtDuration(ms(e.end) - ms(e.start))})
            </>,
          ],
          !!(e.location || e.videoLink) && ['Where', e.videoLink ? `${e.videoLink} video call` : e.location],
          e.attendees.length > 0 && ['With', e.attendees.join(', ')],
        ]}
      />
      {e.notes && <Prose>{e.notes}</Prose>}
    </DrawerView>
  );
}
