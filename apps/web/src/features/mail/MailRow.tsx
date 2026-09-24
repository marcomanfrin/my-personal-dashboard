import { HOUR, ms, type Email } from '@argus/shared';
import { Icon } from '../../components/ui/Icon';
import { Avatar, IconButton, LevelPill, Pill, SrOnly, Tag } from '../../components/ui/primitives';
import { useDrawer } from '../../drawer/DrawerContext';
import { useActions } from '../../hooks/useActions';
import { useDashboard } from '../../hooks/useDashboard';
import { cn } from '../../lib/cn';
import { dueText, relPast } from '../../lib/format';
import { MAIL_CAT_LABEL } from '../../lib/labels';

export function MailRow({ email: e }: { email: Email }) {
  const { now } = useDashboard();
  const { open } = useDrawer();
  const { markEmailDone } = useActions();
  const dueSoon = e.deadline && ms(e.deadline) - now.getTime() < 6 * HOUR;

  return (
    <li className="group relative flex items-start gap-1 rounded-md hover:bg-surface-2 [&+&]:border-t [&+&]:border-line">
      {!e.read && <span aria-hidden="true" className="absolute top-[25px] -left-[3px] size-1.5 rounded-full bg-accent" />}
      <button type="button" onClick={() => open('email', e.id)} className="flex min-w-0 flex-1 gap-3 py-3 pr-1.5 pl-2">
        <Avatar name={e.from.name} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="truncate text-sm font-bold">{e.from.name}</span>
            <span className="min-w-0 truncate text-[12.5px] text-fg-3">{e.from.org}</span>
            <time dateTime={e.receivedAt} className="ml-auto text-xs font-semibold whitespace-nowrap text-fg-3">
              {relPast(e.receivedAt, now)}
            </time>
          </span>
          <span className={cn('truncate text-sm', e.read ? 'font-[550] text-fg-2' : 'font-semibold text-fg')}>
            {!e.read && <SrOnly>Unread: </SrOnly>}
            {e.subject}
          </span>
          <span className="line-clamp-1 text-[13px] text-fg-3">{e.preview}</span>
          <span className="mt-1.5 flex flex-wrap items-center gap-2.5">
            {e.priority !== 'normal' ? <LevelPill level={e.priority} /> : <Pill quiet>{MAIL_CAT_LABEL[e.category]}</Pill>}
            {e.deadline && !e.done && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-xs font-bold',
                  dueSoon ? 'lvl-critical text-c' : 'text-fg-2',
                )}
              >
                <Icon name="clock" size="xs" />
                Due {dueText(e.deadline, true, now)}
              </span>
            )}
            {e.attachments.length > 0 && <Tag icon="clip">{e.attachments.length}</Tag>}
          </span>
        </span>
      </button>
      {!e.done && (
        <IconButton
          icon="check"
          label={`Mark “${e.subject}” as done`}
          tip="Mark as done"
          onClick={() => markEmailDone(e.id)}
          className="mt-2.5 mr-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-ok/12 hover:text-ok [@media(hover:none)]:opacity-100"
        />
      )}
    </li>
  );
}
