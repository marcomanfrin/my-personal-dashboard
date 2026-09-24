import type { Resource } from '@command/shared';
import type { Db } from '../db/client';
import { createActionsRepository } from '../modules/actions/repository';
import type { EventBus } from '../plugins/events-bus';
import { notFound } from './errors';
import type { ListOptions, ResourceRepository } from './resource-repository';

type Dto = Record<string, unknown>;
export type RecordBase = { id: string; externalId: string };

export interface ResourceServiceDeps {
  db: Db;
  bus: EventBus;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * Read access plus the three user operations on a resource. Each user operation
 * updates the record and queues an action for the owning agent in one transaction,
 * then notifies SSE subscribers.
 */
export function createResourceService<T extends RecordBase>(
  resource: Resource,
  repository: (db: Db) => ResourceRepository<T>,
  { db, bus }: ResourceServiceDeps,
) {
  const repo = repository(db);
  const label = resource.replace(/s$/, '');
  const changed = (ids: string[], deleted?: string[]) =>
    bus.publish({ type: 'data.changed', data: { resource, ids, origin: 'user', ...(deleted && { deleted }) } });

  return {
    resource,
    repository: repo,

    list(opts?: ListOptions): Promise<T[]> {
      return repo.list(opts);
    },

    async get(id: string): Promise<T> {
      const row = await repo.get(id);
      if (!row) throw notFound(label);
      return row;
    },

    /** Applies a user change. Fields whose value does not change are ignored; no-ops queue nothing. */
    async update(id: string, patch: Dto): Promise<T> {
      const result = await db.transaction(async (tx) => {
        const r = repository(tx);
        const current = (await r.get(id)) as Dto | null;
        if (!current) throw notFound(label);
        const changes: Dto = {};
        const previous: Dto = {};
        for (const [k, v] of Object.entries(patch)) {
          if (v === undefined) continue;
          const next = r.dateFields.has(k) && typeof v === 'string' ? new Date(v).toISOString() : v;
          if (same(current[k], next)) continue;
          changes[k] = next;
          previous[k] = current[k];
        }
        if (!Object.keys(changes).length) return { row: current as T, touched: false };
        const row = (await r.update(id, changes))!;
        await createActionsRepository(tx).enqueue({
          resource,
          type: 'update',
          recordId: id,
          externalId: row.externalId,
          changes,
          previous,
        });
        return { row, touched: true };
      });
      if (result.touched) changed([id]);
      return result.row;
    },

    async create(dto: Dto & { externalId: string }): Promise<T> {
      const row = await db.transaction(async (tx) => {
        const created = await repository(tx).insert(dto);
        await createActionsRepository(tx).enqueue({
          resource,
          type: 'create',
          recordId: created.id,
          externalId: created.externalId,
          changes: dto,
          previous: null,
        });
        return created;
      });
      changed([row.id]);
      return row;
    },

    async remove(id: string): Promise<T> {
      const row = await db.transaction(async (tx) => {
        const removed = await repository(tx).remove(id);
        if (!removed) throw notFound(label);
        await createActionsRepository(tx).enqueue({
          resource,
          type: 'delete',
          recordId: id,
          externalId: removed.externalId,
          changes: {},
          previous: removed as unknown as Dto,
        });
        return removed;
      });
      changed([], [id]);
      return row;
    },
  };
}

export type ResourceService<T extends RecordBase> = ReturnType<typeof createResourceService<T>>;
