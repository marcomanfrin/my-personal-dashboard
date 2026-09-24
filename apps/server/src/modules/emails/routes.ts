import { EmailPatch, MailCategory } from '@argus/shared';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { idOf, patchOf, queryOf } from '../../lib/routes';

const ListQuery = z.object({ category: MailCategory.optional() });

export const emailsRoutes: FastifyPluginAsync = async (app) => {
  const { emails } = app.container.resources;

  app.get('/emails', { preHandler: app.auth.any }, async (req) => emails.list(queryOf(ListQuery, req)));
  app.get('/emails/:id', { preHandler: app.auth.any }, async (req) => emails.get(idOf(req)));
  app.patch('/emails/:id', { preHandler: app.auth.user }, async (req) =>
    emails.update(idOf(req), patchOf(EmailPatch, req)),
  );
};
