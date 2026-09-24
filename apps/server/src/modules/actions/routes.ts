import { ActionClaim, ActionComplete, ActionQuery } from '@command/shared';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { parse } from '../../lib/validate';

const IdParams = z.object({ id: z.uuid() });

/** The outbox as seen by agents (claim/complete) and by the user (list). */
export const actionsRoutes: FastifyPluginAsync = async (app) => {
  const { actions } = app.container;

  app.get('/actions', { preHandler: app.auth.any }, async (req) =>
    actions.list(parse(ActionQuery, req.query, 'Query'), req.agent),
  );

  app.post('/actions/claim', { preHandler: app.auth.agent }, async (req) =>
    actions.claim(req.agent!, parse(ActionClaim, req.body)),
  );

  app.patch('/actions/:id', { preHandler: app.auth.agent }, async (req) => {
    const { id } = parse(IdParams, req.params, 'Path');
    return actions.complete(req.agent!, id, parse(ActionComplete, req.body));
  });
};
