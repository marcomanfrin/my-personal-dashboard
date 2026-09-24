import type { Project } from '@command/shared';
import type { Db } from '../../db/client';
import { projects } from '../../db/schema';
import { createResourceRepository } from '../../lib/resource-repository';

export const createProjectsRepository = (db: Db) =>
  createResourceRepository<Project>(db, projects, { column: projects.key, dir: 'asc' });
