import type { CalendarEvent } from '@command/shared';
import type { Db } from '../../db/client';
import { events } from '../../db/schema';
import { createResourceRepository } from '../../lib/resource-repository';

export const createEventsRepository = (db: Db) =>
  createResourceRepository<CalendarEvent>(db, events, { column: events.start, dir: 'asc' });
