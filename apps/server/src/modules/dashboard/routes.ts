import type { FastifyPluginAsync } from 'fastify';

export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  const { dashboard } = app.container;

  /** Everything the dashboard renders, with attention, KPIs and project summaries computed. */
  app.get('/dashboard', { preHandler: app.auth.user }, async () => dashboard.get());
  app.get('/sources', { preHandler: app.auth.any }, async () => dashboard.sources());
};
