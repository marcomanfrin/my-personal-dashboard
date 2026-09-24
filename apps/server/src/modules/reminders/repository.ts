import type { Reminder } from '@command/shared';
import type { Db } from '../../db/client';
import { reminders } from '../../db/schema';
import { createResourceRepository } from '../../lib/resource-repository';

export const createRemindersRepository = (db: Db) =>
  createResourceRepository<Reminder>(db, reminders, { column: reminders.due, dir: 'asc' });
