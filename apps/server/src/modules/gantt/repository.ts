import type { GanttTask } from '@command/shared';
import type { Db } from '../../db/client';
import { ganttTasks } from '../../db/schema';
import { createResourceRepository } from '../../lib/resource-repository';

export const createGanttRepository = (db: Db) =>
  createResourceRepository<GanttTask>(db, ganttTasks, { column: ganttTasks.start, dir: 'asc' });
