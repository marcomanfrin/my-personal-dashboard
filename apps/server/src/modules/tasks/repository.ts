import type { Task } from '@argus/shared';
import type { Db } from '../../db/client';
import { tasks } from '../../db/schema';
import { createResourceRepository } from '../../lib/resource-repository';

export const createTasksRepository = (db: Db) =>
  createResourceRepository<Task>(db, tasks, { column: tasks.position, dir: 'asc' }); // nulls last
