import type { PullRequest } from '@command/shared';
import type { Db } from '../../db/client';
import { pulls } from '../../db/schema';
import { createResourceRepository } from '../../lib/resource-repository';

export const createPullsRepository = (db: Db) =>
  createResourceRepository<PullRequest>(db, pulls, { column: pulls.createdAt, dir: 'desc' });
