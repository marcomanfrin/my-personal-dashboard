import type { Email } from '@command/shared';
import { Icon } from '../../components/ui/Icon';
import { Avatar, Button, Kv, LevelPill } from '../../components/ui/primitives';
import { useDrawer } from '../../drawer/DrawerContext';
import { DrawerSection, DrawerView, Prose } from '../../drawer/DrawerShell';
import { useActions } from '../../hooks/useActions';
import { fmtLong, fmtTime } from '../../lib/format';
import { MAIL_CAT_LABEL } from '../../lib/labels';

export function EmailDrawer({ email: e }: { email: Email }) {
  const { close } = useDrawer();
  const { markEmailDone, moveEmail } = useActions();

  const foot = e.done ? (
    <Button icon="mail" onClick={() => moveEmail(e.id, 'needs-reply')}>
      Move back to inbox
    </Button>
  ) : (
    <>
      <Button
        variant="primary"
        icon="check"
        onClick={() => {
          close();
          markEmailDone(e.id);
        }}
      >
        Mark as done
      </Button>
      {e.category !== 'waiting' && (
        <Button icon="hourglass" onClick={() => moveEmail(e.id, 'waiting')}>
          Move to Waiting
        </Button>
      )}
    </>
  );

  return (
    <DrawerView kickerIcon="mail" kicker={`Mail, ${MAIL_CAT_LABEL[e.category]}`} title={e.subject} foot={foot}>
      <div className="flex items-center gap-3">
        <Avatar name={e.from.name} />
        <div>
          <b>{e.from.name}</b>
          <div className="text-[12.5px] text-fg-3">{e.from.address}</div>
        </div>
      </div>
      <Kv
        rows={[
          ['Received', `${fmtLong(e.receivedAt)}, ${fmtTime(e.receivedAt)}`],
          ['Priority', e.priority === 'normal' ? 'Normal' : <LevelPill level={e.priority} />],
          !!e.deadline && ['Deadline', `${fmtLong(e.deadline)}, ${fmtTime(e.deadline)}`],
        ]}
      />
      <Prose>{e.body}</Prose>
      {e.attachments.length > 0 && (
        <DrawerSection title="Attachments">
          <div className="flex flex-col gap-1.5">
            {e.attachments.map((a) => (
              <div
                key={a}
                className="flex items-center gap-2 rounded-[10px] border border-line bg-surface-2 px-[11px] py-[9px] text-[13px] font-semibold"
              >
                <Icon name="clip" size="sm" />
                {a}
              </div>
            ))}
          </div>
        </DrawerSection>
      )}
      {e.url && (
        <a href={e.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] font-bold text-accent-text hover:underline">
          <Icon name="external" size="sm" />
          Open in mail client
        </a>
      )}
    </DrawerView>
  );
}
