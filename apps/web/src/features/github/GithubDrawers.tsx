import { prLevel, type Issue, type PullRequest } from '@argus/shared';
import { Icon } from '../../components/ui/Icon';
import { Button, Kv, LevelPill, StateBadge } from '../../components/ui/primitives';
import { useDrawer } from '../../drawer/DrawerContext';
import { CheckRow, DrawerSection, DrawerView, Prose } from '../../drawer/DrawerShell';
import { useActions } from '../../hooks/useActions';
import { useDashboard } from '../../hooks/useDashboard';
import { relPast } from '../../lib/format';
import { ISSUE_ICON, PR_STATUS_TEXT } from '../../lib/labels';

function OpenOnGithub({ url }: { url?: string | null }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex h-[38px] items-center gap-[7px] rounded-[10px] border border-line-strong bg-surface px-3.5 text-[13.5px] font-bold hover:bg-surface-2"
    >
      <Icon name="external" size="sm" />
      Open on GitHub
    </a>
  );
}

export function PrDrawer({ pr: p }: { pr: PullRequest }) {
  const { now, user } = useDashboard();
  const { close } = useDrawer();
  const { markReviewed } = useActions();
  const c = p.checks;
  return (
    <DrawerView
      kickerIcon="pr"
      kicker={`${p.repo} #${p.number}`}
      title={p.title}
      foot={
        <>
          {p.reviewRequested && (
            <Button
              variant="primary"
              icon="check"
              onClick={() => {
                close();
                markReviewed(p.id);
              }}
            >
              Mark review done
            </Button>
          )}
          <OpenOnGithub url={p.url} />
        </>
      }
    >
      <Kv
        rows={[
          ['Author', p.author === user.githubLogin ? 'You' : p.author],
          ['Status', `${PR_STATUS_TEXT[p.status]}${p.blockedBy ? `, waiting on ${p.blockedBy}` : ''}`],
          ['Opened', relPast(p.createdAt, now)],
          ['Your review', p.reviewRequested ? <LevelPill level={prLevel(p, now)}>Requested</LevelPill> : 'Not requested'],
        ]}
      />
      <DrawerSection title="Checks">
        {c.failedNames.map((n) => (
          <CheckRow key={n} className="st-error" icon="xCircle">
            {n}
            <span className="ml-auto text-fg-3">failed</span>
          </CheckRow>
        ))}
        {c.pending > 0 && (
          <CheckRow className="st-pending" icon="pending">
            {c.pending} checks running
          </CheckRow>
        )}
        {c.passed > 0 && (
          <CheckRow className="st-success" icon="checkCircle">
            {c.passed} checks passed
          </CheckRow>
        )}
      </DrawerSection>
    </DrawerView>
  );
}

export function IssueDrawer({ issue: i }: { issue: Issue }) {
  const { now } = useDashboard();
  const { close } = useDrawer();
  const { ackIssue } = useActions();
  return (
    <DrawerView
      kickerIcon={ISSUE_ICON[i.kind]}
      kicker={`${i.repo}${i.number ? ` #${i.number}` : ''}`}
      title={i.title}
      foot={
        <>
          {!i.acknowledged && (
            <Button
              variant="primary"
              icon="check"
              onClick={() => {
                close();
                ackIssue(i.id);
              }}
            >
              Acknowledge
            </Button>
          )}
          <OpenOnGithub url={i.url} />
        </>
      }
    >
      <Kv
        rows={[
          ['State', <StateBadge state={i.state} />],
          ['Priority', <LevelPill level={i.level} />],
          ['Since', relPast(i.createdAt, now)],
        ]}
      />
      <Prose>{i.detail}</Prose>
    </DrawerView>
  );
}
