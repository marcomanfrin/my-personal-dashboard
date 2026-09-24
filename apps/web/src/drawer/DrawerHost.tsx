import type { DashboardData } from '@command/shared';
import { useEffect, type ReactNode } from 'react';
import { EventDrawer } from '../features/calendar/EventDrawer';
import { GanttDrawer } from '../features/gantt/GanttDrawer';
import { IssueDrawer, PrDrawer } from '../features/github/GithubDrawers';
import { EmailDrawer } from '../features/mail/EmailDrawer';
import { ProfileDrawer } from '../features/profile/ProfileDrawer';
import { TaskDrawer } from '../features/trello/TaskDrawer';
import { useDashboard } from '../hooks/useDashboard';
import { useDrawer, type DrawerTarget } from './DrawerContext';
import { DrawerShell } from './DrawerShell';

/** The drawer for a target, or null when its record no longer exists. */
function resolve(target: DrawerTarget, data: DashboardData): ReactNode {
  const byId = <T extends { id: string }>(list: T[]) => list.find((x) => x.id === target.id);
  switch (target.type) {
    case 'email': {
      const e = byId(data.emails);
      return e ? <EmailDrawer email={e} /> : null;
    }
    case 'event': {
      const e = byId(data.events);
      return e ? <EventDrawer event={e} /> : null;
    }
    case 'pr': {
      const p = byId(data.pulls);
      return p ? <PrDrawer pr={p} /> : null;
    }
    case 'issue': {
      const i = byId(data.issues);
      return i ? <IssueDrawer issue={i} /> : null;
    }
    case 'task': {
      const t = byId(data.tasks);
      return t ? <TaskDrawer task={t} /> : null;
    }
    case 'gantt': {
      const t = byId(data.gantt);
      return t ? <GanttDrawer task={t} /> : null;
    }
    case 'profile':
      return <ProfileDrawer />;
  }
}

export function DrawerHost() {
  const { current, close } = useDrawer();
  const { data } = useDashboard();
  const content = current ? resolve(current, data) : null;
  const missing = !!current && !content;

  // The record was deleted meanwhile (e.g. an agent's full sync): close.
  useEffect(() => {
    if (missing) close();
  }, [missing, close]);

  if (!content) return null;
  return <DrawerShell onClose={close}>{content}</DrawerShell>;
}
