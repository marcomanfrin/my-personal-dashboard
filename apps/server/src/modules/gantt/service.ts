import { rescheduleByDependencies, type GanttTask, type GanttTaskPatch } from '@command/shared';
import { eq } from 'drizzle-orm';
import { ganttTasks } from '../../db/schema';
import { badRequest } from '../../lib/errors';
import { createResourceService, type ResourceServiceDeps } from '../../lib/resource-service';
import { createGanttRepository } from './repository';

export interface Rescheduled {
  id: string;
  key: string;
  start: string;
  end: string;
  previous: { start: string; end: string };
}

export function createGanttService(deps: ResourceServiceDeps) {
  const base = createResourceService<GanttTask>('gantt', createGanttRepository, deps);

  const update = async (id: string, patch: GanttTaskPatch) => {
    if (patch.start || patch.end) {
      const current = await base.get(id);
      const start = new Date(patch.start ?? current.start);
      const end = new Date(patch.end ?? current.end);
      if (end < start) throw badRequest('end must not be before start');
    }
    return base.update(id, patch);
  };

  return {
    resource: base.resource,
    repository: base.repository,
    get: base.get,
    /** The company plan holds everyone's tasks; filter by assignee for a personal view. */
    list: (q: { assignee?: string } = {}) =>
      base.list({ where: q.assignee ? eq(ganttTasks.assignee, q.assignee) : undefined }),
    update,

    /**
     * Moves every task that starts before a predecessor ends, keeping durations.
     * Each move is a user change (queued for the planning agent). Returns what
     * moved with the previous dates, so the client can offer undo.
     */
    async recalc(): Promise<Rescheduled[]> {
      const all = await base.list();
      const byKey = new Map(all.map((t) => [t.key, t]));
      const out: Rescheduled[] = [];
      for (const m of rescheduleByDependencies(all)) {
        const t = byKey.get(m.key)!;
        await base.update(t.id, { start: m.start, end: m.end });
        out.push({ id: t.id, key: t.key, start: m.start, end: m.end, previous: { start: t.start, end: t.end } });
      }
      return out;
    },
  };
}

export type GanttService = ReturnType<typeof createGanttService>;
