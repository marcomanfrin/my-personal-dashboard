import { IsoDate } from '@argus/shared';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { idOf, queryOf } from '../../lib/routes';

const ListQuery = z.object({ from: IsoDate.optional(), to: IsoDate.optional() });

export const eventsRoutes: FastifyPluginAsync = async (app) => {
  const { events } = app.container.resources;

  app.get('/events', { preHandler: app.auth.any }, async (req) => events.list(queryOf(ListQuery, req)));
  app.get('/events/:id', { preHandler: app.auth.any }, async (req) => events.get(idOf(req)));
};
