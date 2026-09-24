import type { ResourceServiceDeps } from '../lib/resource-service';
import { createEmailsService } from './emails/service';
import { createEventsService } from './events/service';
import { createGanttService } from './gantt/service';
import { createIssuesService } from './issues/service';
import { createProjectsService } from './projects/service';
import { createPullsService } from './pulls/service';
import { createRemindersService } from './reminders/service';
import { createTasksService } from './tasks/service';

export function createResourceServices(deps: ResourceServiceDeps) {
  return {
    emails: createEmailsService(deps),
    events: createEventsService(deps),
    pulls: createPullsService(deps),
    issues: createIssuesService(deps),
    reminders: createRemindersService(deps),
    tasks: createTasksService(deps),
    projects: createProjectsService(deps),
    gantt: createGanttService(deps),
  };
}

export type Resources = ReturnType<typeof createResourceServices>;
