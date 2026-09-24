import type { Resource, SourceStatus } from '@command/shared';
import { useQuery } from '@tanstack/react-query';
import { endpoints } from '../../api/endpoints';
import { queryKeys } from '../../api/queryClient';
import { useSession } from '../../auth/AuthGate';
import { logout } from '../../auth/session';
import { Icon } from '../../components/ui/Icon';
import { Button, Kv, Lamp, Pill } from '../../components/ui/primitives';
import { DrawerSection, DrawerView } from '../../drawer/DrawerShell';
import { useDashboard } from '../../hooks/useDashboard';
import { useTheme } from '../../hooks/useTheme';
import { cn } from '../../lib/cn';
import { relPast } from '../../lib/format';

const RESOURCE_LABEL: Record<Resource, string> = {
  emails: 'Mail',
  events: 'Calendar',
  pulls: 'Pull requests',
  issues: 'Errors & issues',
  reminders: 'Reminders',
  tasks: 'Trello',
  projects: 'Projects',
  gantt: 'Plan',
};

const LIVE_TEXT = { live: 'Live', connecting: 'Connecting…', offline: 'Offline' };

function SourceRow({ s, now }: { s: SourceStatus; now: Date }) {
  const failed = s.lastRun?.status === 'error';
  return (
    <div className="flex items-start gap-2.5 py-2 text-[13px] [&+&]:border-t [&+&]:border-line">
      <span className={cn('mt-1.5', failed ? 'st-error' : s.lastSyncAt ? 'st-success' : 'st-pending')}>
        <Lamp />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <b className="font-bold">{RESOURCE_LABEL[s.resource]}</b>
          <span className="text-fg-3">{s.count}</span>
          <span className="ml-auto text-xs whitespace-nowrap text-fg-3">
            {s.lastSyncAt ? `synced ${relPast(s.lastSyncAt, now)}` : 'never synced'}
          </span>
        </div>
        <div className="truncate text-xs text-fg-3">
          {s.agents.length ? s.agents.join(', ') : 'No agent assigned'}
          {s.lastRun?.summary && ` · ${s.lastRun.summary}`}
        </div>
        {failed && s.lastRun?.error && <div className="text-xs font-semibold text-crit">{s.lastRun.error}</div>}
      </div>
    </div>
  );
}

export function ProfileDrawer() {
  const { user, sources, now, live } = useDashboard();
  const account = useSession()?.user;
  const { theme, toggle } = useTheme();
  const agents = useQuery({ queryKey: queryKeys.agents, queryFn: endpoints.agents });
  const runs = agents.data?.runs.slice(0, 6) ?? [];

  return (
    <DrawerView
      kickerIcon="users"
      kicker="Profile"
      title={user.name}
      foot={
        <>
          <Button icon={theme === 'dark' ? 'sun' : 'moon'} onClick={toggle}>
            Switch to {theme === 'dark' ? 'light' : 'dark'} mode
          </Button>
          <Button icon="logout" onClick={() => void logout()}>
            Sign out
          </Button>
        </>
      }
    >
      <Kv
        rows={[
          !!user.role && ['Role', user.role],
          !!account && ['Account', account.email],
          !!user.githubLogin && ['GitHub', user.githubLogin],
          ['Theme', theme === 'dark' ? 'Dark' : 'Light'],
          [
            'Updates',
            <span className={cn('inline-flex items-center gap-2', live === 'live' ? 'st-success' : live === 'offline' ? 'st-error' : 'st-pending')}>
              <Lamp pulse={live === 'live'} />
              {LIVE_TEXT[live]}
            </span>,
          ],
        ]}
      />
      <DrawerSection title="Data sources">
        {sources.map((s) => (
          <SourceRow key={s.resource} s={s} now={now} />
        ))}
      </DrawerSection>
      <DrawerSection title="Recent agent runs">
        {!runs.length && <p className="text-[13px] text-fg-3">{agents.isLoading ? 'Loading…' : 'No runs yet.'}</p>}
        {runs.map((r) => (
          <div key={r.id} className="flex items-center gap-2 py-1.5 text-[13px] [&+&]:border-t [&+&]:border-line">
            <Icon name="bot" size="sm" className="text-fg-3" />
            <b className="font-semibold">{r.agent}</b>
            <span className="truncate text-fg-3">{r.resource ? RESOURCE_LABEL[r.resource] : 'all'}</span>
            <Pill className={cn('ml-auto', r.status === 'error' ? 'st-error' : r.status === 'running' ? 'st-pending' : 'st-success')}>
              {r.status}
            </Pill>
            <span className="text-xs whitespace-nowrap text-fg-3">{relPast(r.startedAt, now)}</span>
          </div>
        ))}
      </DrawerSection>
    </DrawerView>
  );
}
