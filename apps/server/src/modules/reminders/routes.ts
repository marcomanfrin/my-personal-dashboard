import { ReminderCreate, ReminderPatch } from '@command/shared';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { idOf, patchOf, queryOf } from '../../lib/routes';
import { parse } from '../../lib/validate';

const ListQuery = z.object({ done: z.stringbool().optional() });

export const remindersRoutes: FastifyPluginAsync = async (app) => {
  const { reminders } = app.container.resources;

  app.get('/reminders', { preHandler: app.auth.any }, async (req) => reminders.list(queryOf(ListQuery, req)));
  app.get('/reminders/:id', { preHandler: app.auth.any }, async (req) => reminders.get(idOf(req)));

  app.post('/reminders', { preHandler: app.auth.user }, async (req, reply) => {
    const created = await reminders.create(parse(ReminderCreate, req.body, 'Body'));
    return reply.status(201).send(created);
  });

  app.patch('/reminders/:id', { preHandler: app.auth.user }, async (req) =>
    reminders.update(idOf(req), patchOf(ReminderPatch, req)),
  );

  app.delete('/reminders/:id', { preHandler: app.auth.user }, async (req, reply) => {
    await reminders.remove(idOf(req));
    return reply.status(204).send();
  });
};
