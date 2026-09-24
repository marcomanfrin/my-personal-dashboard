import { PreferencesPatch } from '@command/shared';
import type { FastifyPluginAsync } from 'fastify';
import { nonEmpty, parse } from '../../lib/validate';

/** The signed-in user's dashboard settings. */
export const preferencesRoutes: FastifyPluginAsync = async (app) => {
  const { preferences } = app.container;

  app.get('/preferences', { preHandler: app.auth.user }, async (req) => preferences.get(req.user!.sub));

  app.patch('/preferences', { preHandler: app.auth.user }, async (req) =>
    preferences.update(req.user!.sub, nonEmpty(parse(PreferencesPatch, req.body ?? {}))),
  );
};
