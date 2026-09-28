import { RESOURCES, type DashboardData, type Job, type Resource } from '@argus/shared';
import { useEffect, type ReactNode } from 'react';
import { EventDrawer } from '../features/calendar/EventDrawer';
import { GanttDrawer } from '../features/gantt/GanttDrawer';
import { IssueDrawer, PrDrawer } from '../features/github/GithubDrawers';
import { DelegateDrawer } from '../features/jobs/DelegateDrawer';
import { JobDrawer } from '../features/jobs/JobDrawer';
import { EmailDrawer } from '../features/mail/EmailDrawer';
import { ProfileDrawer } from '../features/profile/ProfileDrawer';
import { TaskDrawer } from '../features/trello/TaskDrawer';
import { useDashboard } from '../hooks/useDashboard';
import { useJobs } from '../hooks/useJobs';
import { useDrawer, type DrawerTarget } from './DrawerContext';
import { DrawerShell } from './DrawerShell';

/** The drawer for a target, or null when its record no longer exists. */
function resolve(target: DrawerTarget, data: DashboardData, jobs: Job[]): ReactNode {
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
    case 'job': {
      const j = byId(jobs);
      return j ? <JobDrawer job={j} /> : null;
    }
    case 'delegate': {
      const [resource, id] = target.id.split(':') as [Resource, string];
      if (!RESOURCES.includes(resource)) return null;
      const record = (data[resource] as { id: string }[]).find((x) => x.id === id) as
        { id: string; title?: string; name?: string; subject?: string } | undefined;
      const title = record?.title ?? record?.name ?? record?.subject;
      return record ? <DelegateDrawer resource={resource} recordId={id} title={title ?? ''} /> : null;
    }
  }
}

export function DrawerHost() {
  const { current, close } = useDrawer();
  const { data } = useDashboard();
  const { jobs, isLoading } = useJobs();
  const content = current ? resolve(current, data, jobs) : null;
  // A job drawer opened before the list arrived is not missing, only early.
  const missing = !!current && !content && !(current.type === 'job' && isLoading);

  // The record was deleted meanwhile (e.g. an agent's full sync): close.
  useEffect(() => {
    if (missing) close();
  }, [missing, close]);

  if (!content) return null;
  return <DrawerShell onClose={close}>{content}</DrawerShell>;
}
