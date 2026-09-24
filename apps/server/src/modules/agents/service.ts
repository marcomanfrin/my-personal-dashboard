import { createHash, randomBytes } from 'node:crypto';
import {
  RESOURCES,
  type Agent,
  type AgentRun,
  type AgentRunFinish,
  type AgentRunStart,
  type Resource,
} from '@command/shared';
import type { Db } from '../../db/client';
import { conflict, forbidden, notFound } from '../../lib/errors';
import type { EventBus } from '../../plugins/events-bus';
import { createAgentsRepository } from './repository';

export const AGENT_TOKEN_PREFIX = 'cmd_agent_';

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const newToken = () => AGENT_TOKEN_PREFIX + randomBytes(24).toString('base64url');

export function assertScope(agent: Agent, resource: Resource): void {
  if (!agent.scopes.includes(resource)) throw forbidden(`Agent "${agent.name}" has no scope on ${resource}`);
}

export function createAgentsService({ db, bus }: { db: Db; bus: EventBus }) {
  const repo = createAgentsRepository(db);

  const publishRun = (run: AgentRun, agent: Agent) =>
    bus.publish({
      type: 'agent.run',
      data: { runId: run.id, agent: agent.name, resource: run.resource, status: run.status },
    });

  return {
    repository: repo,

    /** Creates an agent and returns its token: the only time the token is visible. */
    async register(name: string, scopes: Resource[] = [...RESOURCES]): Promise<{ agent: Agent; token: string }> {
      const token = newToken();
      const agent = await repo.create(name, scopes, hashToken(token));
      return { agent, token };
    },

    async rotateToken(name: string): Promise<{ agent: Agent; token: string }> {
      const token = newToken();
      const agent = await repo.rotateToken(name, hashToken(token));
      if (!agent) throw notFound('agent');
      return { agent, token };
    },

    async authenticate(token: string): Promise<Agent | null> {
      const agent = await repo.findByTokenHash(hashToken(token));
      if (agent) await repo.touch(agent.id);
      return agent;
    },

    list: () => repo.list(),
    recentRuns: (limit?: number) => repo.recentRuns(limit),
    latestRunByResource: () => repo.latestRunByResource(),

    async startRun(agent: Agent, body: AgentRunStart): Promise<AgentRun> {
      if (body.resource) assertScope(agent, body.resource);
      const run = await repo.startRun(agent.id, body.resource ?? null, body.summary ?? null);
      publishRun(run, agent);
      return run;
    },

    /** A run the agent owns and has not finished yet. */
    async openRun(agent: Agent, runId: string): Promise<AgentRun> {
      const run = await repo.getRun(runId);
      if (!run || run.agentId !== agent.id) throw notFound('run');
      if (run.status !== 'running') throw conflict('Run already finished');
      return run;
    },

    async finishRun(agent: Agent, runId: string, body: AgentRunFinish): Promise<AgentRun> {
      await this.openRun(agent, runId);
      const run = await repo.finishRun(runId, body.status, body.summary, body.error ?? null);
      publishRun(run, agent);
      return run;
    },

    addRunStats: (runId: string, upserted: number, deleted: number) => repo.addRunStats(runId, upserted, deleted),
  };
}

export type AgentsService = ReturnType<typeof createAgentsService>;
