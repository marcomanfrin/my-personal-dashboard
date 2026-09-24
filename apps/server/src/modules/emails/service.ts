import { normalizeEmailPatch, type Email, type EmailPatch, type MailCategory } from '@argus/shared';
import { eq } from 'drizzle-orm';
import { emails } from '../../db/schema';
import { createResourceService, type ResourceServiceDeps } from '../../lib/resource-service';
import { createEmailsRepository } from './repository';

export function createEmailsService(deps: ResourceServiceDeps) {
  const base = createResourceService<Email>('emails', createEmailsRepository, deps);
  return {
    ...base,
    list: (q: { category?: MailCategory } = {}) =>
      base.list({ where: q.category ? eq(emails.category, q.category) : undefined }),
    update: (id: string, patch: EmailPatch) => base.update(id, normalizeEmailPatch(patch)),
  };
}

export type EmailsService = ReturnType<typeof createEmailsService>;
