import type { Action, ActionStatus, ActionType, Resource } from '@argus/shared';
import { and, asc, desc, eq, inArray, lt, or, sql } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { actions } from '../../db/schema';
import { toDto } from '../../lib/serialize';

export interface NewAction {
  resource: Resource;
  type: ActionType;
  recordId: string;
  externalId: string;
  changes: Record<string, unknown>;
  previous: Record<string, unknown> | null;
}

/** A claim older than this is considered abandoned and can be claimed again. */
const CLAIM_TIMEOUT_MINUTES = 10;

const map = (rows: Record<string, unknown>[]) => rows.map((r) => toDto<Action>(r));

export function createActionsRepository(db: Db) {
  return {
    async enqueue(a: NewAction): Promise<Action> {
      const [row] = await db.insert(actions).values(a).returning();
      return toDto<Action>(row!);
    },

    async get(id: string): Promise<Action | null> {
      const [row] = await db.select().from(actions).where(eq(actions.id, id)).limit(1);
      return row ? toDto<Action>(row) : null;
    },

    async list(filter: {
      resource?: Resource;
      /** Restrict to these resources (an agent's scopes). */
      resources?: Resource[];
      status?: ActionStatus;
      limit?: number;
    }): Promise<Action[]> {
      const rows = await db
        .select()
        .from(actions)
        .where(
          and(
            filter.resource ? eq(actions.resource, filter.resource) : undefined,
            filter.resources ? inArray(actions.resource, filter.resources) : undefined,
            filter.status ? eq(actions.status, filter.status) : undefined,
          ),
        )
        .orderBy(desc(actions.createdAt))
        .limit(filter.limit ?? 200);
      return map(rows);
    },

    /** Not yet applied to the source system, oldest first. */
    async inFlightFor(resource: Resource, externalIds: string[]): Promise<Action[]> {
      if (!externalIds.length) return [];
      const rows = await db
        .select()
        .from(actions)
        .where(
          and(
            eq(actions.resource, resource),
            inArray(actions.status, ['pending', 'claimed']),
            inArray(actions.externalId, externalIds),
          ),
        )
        .orderBy(asc(actions.createdAt));
      return map(rows);
    },

    /**
     * Atomically hands the oldest pending (or abandoned) actions to an agent.
     * SKIP LOCKED lets several workers claim concurrently without overlap.
     */
    async claim(resource: Resource, agentId: string, limit: number): Promise<Action[]> {
      const stale = sql`now() - make_interval(mins => ${CLAIM_TIMEOUT_MINUTES})`;
      const candidates = db
        .select({ id: actions.id })
        .from(actions)
        .where(
          and(
            eq(actions.resource, resource),
            or(eq(actions.status, 'pending'), and(eq(actions.status, 'claimed'), lt(actions.updatedAt, stale))),
          ),
        )
        .orderBy(asc(actions.createdAt))
        .limit(limit)
        .for('update', { skipLocked: true });
      const rows = await db
        .update(actions)
        .set({ status: 'claimed', agentId, updatedAt: new Date() })
        .where(inArray(actions.id, candidates))
        .returning();
      return map(rows).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },

    async complete(id: string, status: 'done' | 'failed', result: string | null): Promise<Action | null> {
      const [row] = await db
        .update(actions)
        .set({ status, result, updatedAt: new Date() })
        .where(eq(actions.id, id))
        .returning();
      return row ? toDto<Action>(row) : null;
    },
  };
}

export type ActionsRepository = ReturnType<typeof createActionsRepository>;
