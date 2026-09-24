import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import type { Config } from './config/env';
import { createContainer, type Container } from './container';
import type { Db } from './db/client';
import { actionsRoutes } from './modules/actions/routes';
import { agentsRoutes } from './modules/agents/routes';
import { authRoutes } from './modules/auth/routes';
import { dashboardRoutes } from './modules/dashboard/routes';
import { emailsRoutes } from './modules/emails/routes';
import { eventsRoutes } from './modules/events/routes';
import { ganttRoutes } from './modules/gantt/routes';
import { ingestRoutes } from './modules/ingest/routes';
import { preferencesRoutes } from './modules/preferences/routes';
import { issuesRoutes } from './modules/issues/routes';
import { projectsRoutes } from './modules/projects/routes';
import { pullsRoutes } from './modules/pulls/routes';
import { remindersRoutes } from './modules/reminders/routes';
import { streamRoutes } from './modules/stream/routes';
import { tasksRoutes } from './modules/tasks/routes';
import { authPlugin } from './plugins/auth';
import { errorHandlerPlugin } from './plugins/error-handler';

declare module 'fastify' {
  interface FastifyInstance {
    container: Container;
  }
}

export interface BuildOptions {
  config: Config;
  db: Db;
  logger?: boolean;
}

const API_MODULES = [
  authRoutes,
  preferencesRoutes,
  dashboardRoutes,
  emailsRoutes,
  eventsRoutes,
  pullsRoutes,
  issuesRoutes,
  remindersRoutes,
  tasksRoutes,
  projectsRoutes,
  ganttRoutes,
  ingestRoutes,
  agentsRoutes,
  actionsRoutes,
  streamRoutes,
];

/** Builds the app without listening, so tests can drive it with `inject`. */
export async function buildApp({ config, db, logger = true }: BuildOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: logger && { level: config.logLevel },
    bodyLimit: 2 * 1024 * 1024,
  });
  const container = createContainer(db, config);
  app.decorate('container', container);

  await app.register(errorHandlerPlugin);
  await app.register(cors, {
    origin: config.corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    // The refresh cookie must travel on cross-origin calls to /api/auth.
    credentials: true,
  });
  await app.register(cookie);
  // Opt-in per route (login, refresh) via `config.rateLimit`.
  await app.register(rateLimit, { global: false });
  await app.register(authPlugin, { agents: container.agents, auth: container.auth });

  app.get('/health', async (req, reply) => {
    try {
      await db.execute(sql`select 1`);
      return { ok: true };
    } catch (err) {
      req.log.warn({ err }, 'database unreachable');
      return reply.status(503).send({ ok: false, db: 'unreachable' });
    }
  });

  await app.register(
    async (api) => {
      for (const m of API_MODULES) await api.register(m);
    },
    { prefix: '/api' },
  );

  return app;
}
