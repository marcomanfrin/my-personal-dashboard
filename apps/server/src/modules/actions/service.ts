import type { Action, ActionClaim, ActionComplete, ActionQuery, Agent } from '@command/shared';
import type { Db } from '../../db/client';
import { conflict, forbidden, notFound } from '../../lib/errors';
import type { EventBus } from '../../plugins/events-bus';
import { assertScope } from '../agents/service';
import { createActionsRepository } from './repository';

export function createActionsService({ db, bus }: { db: Db; bus: EventBus }) {
  const repo = createActionsRepository(db);
  const notify = (a: Action) =>
    bus.publish({ type: 'action.updated', data: { id: a.id, resource: a.resource, status: a.status } });

  return {
    /** Agents see only their scopes; the user sees everything. */
    list(query: ActionQuery, agent: Agent | null): Promise<Action[]> {
      if (agent && query.resource) assertScope(agent, query.resource);
      return repo.list({ ...query, resources: agent?.scopes });
    },

    async claim(agent: Agent, { resource, limit = 10 }: ActionClaim): Promise<Action[]> {
      assertScope(agent, resource);
      const claimed = await repo.claim(resource, agent.id, limit);
      claimed.forEach(notify);
      return claimed;
    },

    /** Only the agent holding the claim can close an action. */
    async complete(agent: Agent, id: string, body: ActionComplete): Promise<Action> {
      const current = await repo.get(id);
      if (!current) throw notFound('action');
      assertScope(agent, current.resource);
      if (current.status !== 'claimed') throw conflict(`Action is ${current.status}, claim it first`);
      if (current.agentId !== agent.id) throw forbidden('Action is claimed by another agent');
      const done = (await repo.complete(id, body.status, body.result ?? null))!;
      notify(done);
      return done;
    },
  };
}

export type ActionsService = ReturnType<typeof createActionsService>;
