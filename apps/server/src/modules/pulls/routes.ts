import { PullRequestPatch } from '@command/shared';
import type { FastifyPluginAsync } from 'fastify';
import { idOf, patchOf } from '../../lib/routes';

export const pullsRoutes: FastifyPluginAsync = async (app) => {
  const { pulls } = app.container.resources;

  app.get('/pulls', { preHandler: app.auth.any }, async () => pulls.list());
  app.get('/pulls/:id', { preHandler: app.auth.any }, async (req) => pulls.get(idOf(req)));
  app.patch('/pulls/:id', { preHandler: app.auth.user }, async (req) =>
    pulls.update(idOf(req), patchOf(PullRequestPatch, req)),
  );
};
