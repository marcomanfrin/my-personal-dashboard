import { IssuePatch } from '@argus/shared';
import type { FastifyPluginAsync } from 'fastify';
import { idOf, patchOf } from '../../lib/routes';

export const issuesRoutes: FastifyPluginAsync = async (app) => {
  const { issues } = app.container.resources;

  app.get('/issues', { preHandler: app.auth.any }, async () => issues.list());
  app.get('/issues/:id', { preHandler: app.auth.any }, async (req) => issues.get(idOf(req)));
  app.patch('/issues/:id', { preHandler: app.auth.user }, async (req) =>
    issues.update(idOf(req), patchOf(IssuePatch, req)),
  );
};
