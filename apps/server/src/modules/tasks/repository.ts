import type { Task } from '@command/shared';
import type { Db } from '../../db/client';
import { tasks } from '../../db/schema';
import { createResourceRepository } from '../../lib/resource-repository';

export const createTasksRepository = (db: Db) =>
  createResourceRepository<Task>(db, tasks, { column: tasks.updatedAt, dir: 'desc' });
