import type { Task, TaskColumn, TaskPatch } from '@command/shared';
import { and, eq } from 'drizzle-orm';
import { tasks } from '../../db/schema';
import { createResourceService, type ResourceServiceDeps } from '../../lib/resource-service';
import { createTasksRepository } from './repository';

/** Trello cards. The user can move them between columns. */
export function createTasksService(deps: ResourceServiceDeps) {
  const base = createResourceService<Task>('tasks', createTasksRepository, deps);
  return {
    resource: base.resource,
    repository: base.repository,
    get: base.get,
    list: (q: { column?: TaskColumn; board?: string } = {}) =>
      base.list({
        where: and(
          q.column ? eq(tasks.column, q.column) : undefined,
          q.board ? eq(tasks.board, q.board) : undefined,
        ),
      }),
    update: (id: string, patch: TaskPatch) => base.update(id, patch),
  };
}

export type TasksService = ReturnType<typeof createTasksService>;
