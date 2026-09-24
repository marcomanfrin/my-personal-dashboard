import type { Resource } from '@argus/shared';
import type { Db } from '../db/client';
import type { RecordBase } from '../lib/resource-service';
import type { ResourceRepository } from '../lib/resource-repository';
import { createEmailsRepository } from './emails/repository';
import { createEventsRepository } from './events/repository';
import { createGanttRepository } from './gantt/repository';
import { createIssuesRepository } from './issues/repository';
import { createProjectsRepository } from './projects/repository';
import { createPullsRepository } from './pulls/repository';
import { createRemindersRepository } from './reminders/repository';
import { createTasksRepository } from './tasks/repository';

/** Repository factory of each resource, for code that works on any of them (ingest, sources). */
export const RESOURCE_REPOSITORIES: Record<Resource, (db: Db) => ResourceRepository<RecordBase>> = {
  emails: createEmailsRepository,
  events: createEventsRepository,
  pulls: createPullsRepository,
  issues: createIssuesRepository,
  reminders: createRemindersRepository,
  tasks: createTasksRepository,
  projects: createProjectsRepository,
  gantt: createGanttRepository,
};
