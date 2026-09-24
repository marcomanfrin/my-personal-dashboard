import { TaskColumn, TaskPatch } from '@argus/shared';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { idOf, patchOf, queryOf } from '../../lib/routes';

const ListQuery = z.object({ column: TaskColumn.optional(), board: z.string().optional() });

export const tasksRoutes: FastifyPluginAsync = async (app) => {
  const { tasks } = app.container.resources;

  app.get('/tasks', { preHandler: app.auth.any }, async (req) => tasks.list(queryOf(ListQuery, req)));
  app.get('/tasks/:id', { preHandler: app.auth.any }, async (req) => tasks.get(idOf(req)));
  app.patch('/tasks/:id', { preHandler: app.auth.user }, async (req) =>
    tasks.update(idOf(req), patchOf(TaskPatch, req)),
  );
};
