import { prLevel, prState, type Issue, type PrState, type PullRequest } from '@command/shared';
import type { ReactNode } from 'react';
import { Icon } from '../../components/ui/Icon';
import type { IconName } from '../../components/ui/icons';
import { LevelPill, lvl, Pill, SrOnly, StateBadge } from '../../components/ui/primitives';
import { useDrawer } from '../../drawer/DrawerContext';
import { useDashboard } from '../../hooks/useDashboard';
import { cn } from '../../lib/cn';
import { ageShort, relPast } from '../../lib/format';
import { ISSUE_ICON, STATE_LABEL } from '../../lib/labels';
import { repoName } from './filters';

/** Shared layout: state icon, title + meta, badges (below on phones, right-aligned from 640px). */
function GhRow({
  state,
  icon,
  title,
  meta,
  side,
  onOpen,
}: {
  state: PrState;
  icon: IconName;
  title: string;
  meta: ReactNode;
  side: ReactNode;
  onOpen: () => void;
}) {
  return (
    <li className="[&+&]:border-t [&+&]:border-line">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full flex-wrap items-start gap-x-3 rounded-md px-2 py-[11px] hover:bg-surface-2 sm:flex-nowrap sm:items-center"
      >
        <span
          data-tip={STATE_LABEL[state]}
          className={cn('grid size-[30px] flex-none place-items-center rounded-sm bg-c/12 text-c', `st-${state}`)}
        >
          <Icon name={icon} size="sm" />
          <SrOnly>{STATE_LABEL[state]}:</SrOnly>
        </span>
        <span className="min-w-0 flex-1 sm:flex sm:flex-col">
          <span className="block text-sm leading-[1.35] font-[650]">{title}</span>
          <span className="mt-0.5 block text-[12.5px] text-fg-3">{meta}</span>
        </span>
        <span className="mt-[7px] flex basis-full flex-wrap gap-1.5 pl-[42px] sm:mt-0 sm:max-w-[45%] sm:flex-none sm:basis-auto sm:justify-end sm:pl-0">
          {side}
        </span>
      </button>
    </li>
  );
}

export function PrRow({ pr: p }: { pr: PullRequest }) {
  const { now, user } = useDashboard();
  const { open } = useDrawer();
  const c = p.checks;
  const checks = c.failed ? (
    <StateBadge state="error">{c.failed} failing</StateBadge>
  ) : c.pending ? (
    <StateBadge state="pending">{c.pending} pending</StateBadge>
  ) : (
    <StateBadge state="success">
      {c.passed}/{c.total}
    </StateBadge>
  );
  const extra =
    p.status === 'blocked' ? (
      <StateBadge state="blocked">Blocked</StateBadge>
    ) : p.status === 'draft' ? (
      <Pill quiet>Draft</Pill>
    ) : p.status === 'changes-requested' ? (
      <StateBadge state="warning">Changes requested</StateBadge>
    ) : null;

  return (
    <GhRow
      state={prState(p)}
      icon="pr"
      title={p.title}
      onOpen={() => open('pr', p.id)}
      meta={
        <>
          <span className="font-[650] text-fg-2">{repoName(p.repo)}</span> #{p.number} by{' '}
          {p.author === user.githubLogin ? 'you' : p.author}, {ageShort(p.createdAt, now)}
        </>
      }
      side={
        <>
          {p.reviewRequested && (
            <Pill className={lvl(prLevel(p, now))}>
              <Icon name="users" size="xs" />
              Review requested
            </Pill>
          )}
          {extra}
          {checks}
        </>
      }
    />
  );
}

export function IssueRow({ issue: i }: { issue: Issue }) {
  const { now } = useDashboard();
  const { open } = useDrawer();
  return (
    <GhRow
      state={i.state}
      icon={ISSUE_ICON[i.kind]}
      title={i.title}
      onOpen={() => open('issue', i.id)}
      meta={
        <>
          <span className="font-[650] text-fg-2">{repoName(i.repo)}</span>
          {i.number ? ` #${i.number}` : ''}, {relPast(i.createdAt, now)}
        </>
      }
      side={
        <>
          {i.acknowledged && <Pill quiet>Acknowledged</Pill>}
          {i.level !== 'low' && <LevelPill level={i.level} />}
          <StateBadge state={i.state} />
        </>
      }
    />
  );
}
