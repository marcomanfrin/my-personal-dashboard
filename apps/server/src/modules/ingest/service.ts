import {
  IngestBody,
  RESOURCE_SCHEMAS,
  type Agent,
  type IngestResult,
  type Resource,
} from '@command/shared';
import type { Db } from '../../db/client';
import { badRequest } from '../../lib/errors';
import { formatIssues, parse } from '../../lib/validate';
import type { EventBus } from '../../plugins/events-bus';
import { createActionsRepository } from '../actions/repository';
import { assertScope, type AgentsService } from '../agents/service';
import { RESOURCE_REPOSITORIES } from '../registry';

type Item = Record<string, unknown> & { externalId: string };

/** Validates every item against the resource schema; one bad item rejects the batch. */
function validateItems(resource: Resource, raw: unknown[]): Item[] {
  const schema = RESOURCE_SCHEMAS[resource].input;
  const items: Item[] = [];
  const issues: { path: string; message: string }[] = [];
  raw.forEach((it, i) => {
    const r = schema.safeParse(it);
    if (r.success) items.push(r.data as Item);
    else issues.push(...formatIssues(r.error, `items.${i}`));
  });
  if (issues.length) throw badRequest(`${issues.length} invalid field(s) in items`, issues.slice(0, 50));
  return items;
}

/** Last occurrence wins: Postgres refuses to upsert the same key twice in one statement. */
function dedupe(items: Item[]): Item[] {
  return [...new Map(items.map((it) => [it.externalId, it])).values()];
}

/**
 * The write path of agents. Upserts a batch by externalId; in `replace` mode also
 * deletes the agent's records it no longer reports.
 *
 * User changes still in flight (actions pending or claimed) win over the agent's
 * copy: the source system hasn't seen them yet, so its data is stale on those fields.
 * Records the user deleted are not resurrected until the deletion is processed.
 */
export function createIngestService({ db, bus, agents }: { db: Db; bus: EventBus; agents: AgentsService }) {
  return {
    async ingest(agent: Agent, resource: Resource, body: unknown): Promise<IngestResult> {
      assertScope(agent, resource);
      const { runId, mode, items: raw } = parse(IngestBody, body, 'Body');
      if (runId) await agents.openRun(agent, runId);
      const incoming = dedupe(validateItems(resource, raw));

      const result = await db.transaction(async (tx) => {
        const repo = RESOURCE_REPOSITORIES[resource](tx);
        const inFlight = await createActionsRepository(tx).inFlightFor(
          resource,
          incoming.map((i) => i.externalId),
        );

        const deletedByUser = new Set(inFlight.filter((a) => a.type === 'delete').map((a) => a.externalId));
        const protectedFields: Record<string, string[]> = {};
        const byExternal = new Map(incoming.map((i) => [i.externalId, i]));
        for (const a of inFlight) {
          const item = byExternal.get(a.externalId);
          if (!item || a.type !== 'update') continue;
          Object.assign(item, a.changes);
          protectedFields[a.externalId] = [
            ...new Set([...(protectedFields[a.externalId] ?? []), ...Object.keys(a.changes)]),
          ];
        }

        const items = incoming.filter((i) => !deletedByUser.has(i.externalId));
        const upserted = await repo.upsertMany(items, { agentId: agent.id, syncedAt: new Date() });
        const deleted =
          mode === 'replace'
            ? await repo.deleteMissing(
                agent.id,
                incoming.map((i) => i.externalId),
              )
            : [];
        return { upsertedIds: upserted.map((r) => r.id), deleted, protectedFields };
      });

      if (runId) await agents.addRunStats(runId, result.upsertedIds.length, result.deleted.length);
      if (result.upsertedIds.length || result.deleted.length)
        bus.publish({
          type: 'data.changed',
          data: {
            resource,
            ids: result.upsertedIds,
            origin: 'agent',
            ...(result.deleted.length && { deleted: result.deleted }),
          },
        });

      return {
        upserted: result.upsertedIds.length,
        deleted: result.deleted.length,
        protectedFields: result.protectedFields,
      };
    },
  };
}

export type IngestService = ReturnType<typeof createIngestService>;
