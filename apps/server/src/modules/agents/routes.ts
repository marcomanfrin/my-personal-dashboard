import { AgentRunFinish, AgentRunStart } from '@command/shared';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { parse } from '../../lib/validate';

const RunParams = z.object({ id: z.uuid() });

export const agentsRoutes: FastifyPluginAsync = async (app) => {
  const { agents } = app.container;

  /** Who the calling agent is: handy for connectivity checks. */
  app.get('/agents/me', { preHandler: app.auth.agent }, async (req) => req.agent);

  /** Registered agents and their recent runs, for the dashboard "agents" panel. */
  app.get('/agents', { preHandler: app.auth.user }, async () => {
    const [list, runs] = await Promise.all([agents.list(), agents.recentRuns(50)]);
    return { agents: list, runs };
  });

  app.post('/agents/runs', { preHandler: app.auth.agent }, async (req, reply) => {
    const run = await agents.startRun(req.agent!, parse(AgentRunStart, req.body ?? {}));
    return reply.status(201).send(run);
  });

  app.patch('/agents/runs/:id', { preHandler: app.auth.agent }, async (req) => {
    const { id } = parse(RunParams, req.params, 'Path');
    return agents.finishRun(req.agent!, id, parse(AgentRunFinish, req.body));
  });
};
