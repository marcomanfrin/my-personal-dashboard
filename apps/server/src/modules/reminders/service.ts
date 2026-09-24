import { randomUUID } from 'node:crypto';
import { ReminderCreate, type Reminder, type ReminderPatch } from '@argus/shared';
import { eq } from 'drizzle-orm';
import { reminders } from '../../db/schema';
import { createResourceService, type ResourceServiceDeps } from '../../lib/resource-service';
import { createRemindersRepository } from './repository';

/** Prefix of externalIds for reminders created in the dashboard rather than synced from a source. */
export const LOCAL_ID_PREFIX = 'local:';

/** The one resource the user can also create and delete. */
export function createRemindersService(deps: ResourceServiceDeps) {
  const base = createResourceService<Reminder>('reminders', createRemindersRepository, deps);
  return {
    ...base,
    list: (q: { done?: boolean } = {}) =>
      base.list({ where: q.done === undefined ? undefined : eq(reminders.done, q.done) }),
    update: (id: string, patch: ReminderPatch) => base.update(id, patch),
    create: (input: ReminderCreate) =>
      base.create({ ...ReminderCreate.parse(input), externalId: LOCAL_ID_PREFIX + randomUUID(), agentId: null }),
  };
}

export type RemindersService = ReturnType<typeof createRemindersService>;
