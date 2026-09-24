import type { Issue } from '@command/shared';
import type { Db } from '../../db/client';
import { issues } from '../../db/schema';
import { createResourceRepository } from '../../lib/resource-repository';

export const createIssuesRepository = (db: Db) =>
  createResourceRepository<Issue>(db, issues, { column: issues.createdAt, dir: 'desc' });
