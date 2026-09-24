import type { FastifyPluginAsync } from 'fastify';
import { idOf } from '../../lib/routes';

export const projectsRoutes: FastifyPluginAsync = async (app) => {
  const { projects } = app.container.resources;

  app.get('/projects', { preHandler: app.auth.any }, async () => projects.list());
  app.get('/projects/:id', { preHandler: app.auth.any }, async (req) => projects.get(idOf(req)));
};
