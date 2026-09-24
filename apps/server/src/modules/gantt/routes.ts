import { GanttTaskPatch } from '@argus/shared';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { idOf, patchOf, queryOf } from '../../lib/routes';

/** `assignee=me` resolves to the dashboard owner. */
const ListQuery = z.object({ assignee: z.string().optional() });

export const ganttRoutes: FastifyPluginAsync = async (app) => {
  const { gantt } = app.container.resources;
  const owner = app.container.config.user.name;

  app.get('/gantt', { preHandler: app.auth.any }, async (req) => {
    const { assignee } = queryOf(ListQuery, req);
    return gantt.list({ assignee: assignee === 'me' ? owner : assignee });
  });
  app.get('/gantt/:id', { preHandler: app.auth.any }, async (req) => gantt.get(idOf(req)));
  app.patch('/gantt/:id', { preHandler: app.auth.user }, async (req) =>
    gantt.update(idOf(req), patchOf(GanttTaskPatch, req)),
  );
  app.post('/gantt/recalc', { preHandler: app.auth.user }, async () => ({ moved: await gantt.recalc() }));
};
