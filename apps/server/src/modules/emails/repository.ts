import type { Email } from '@argus/shared';
import type { Db } from '../../db/client';
import { emails } from '../../db/schema';
import { createResourceRepository } from '../../lib/resource-repository';

export const createEmailsRepository = (db: Db) =>
  createResourceRepository<Email>(db, emails, { column: emails.receivedAt, dir: 'desc' });
