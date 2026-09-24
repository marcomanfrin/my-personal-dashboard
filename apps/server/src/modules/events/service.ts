import type { CalendarEvent } from '@command/shared';
import { and, gte, lt } from 'drizzle-orm';
import { events } from '../../db/schema';
import { createResourceService, type ResourceServiceDeps } from '../../lib/resource-service';
import { createEventsRepository } from './repository';

/** Calendar events are read-only for the user: only agents write them. */
export function createEventsService(deps: ResourceServiceDeps) {
  const base = createResourceService<CalendarEvent>('events', createEventsRepository, deps);
  return {
    resource: base.resource,
    repository: base.repository,
    get: base.get,
    /** Events starting in [from, to). */
    list: (q: { from?: string; to?: string } = {}) =>
      base.list({
        where: and(
          q.from ? gte(events.start, new Date(q.from)) : undefined,
          q.to ? lt(events.start, new Date(q.to)) : undefined,
        ),
      }),
  };
}

export type EventsService = ReturnType<typeof createEventsService>;
