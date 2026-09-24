import { and, asc, count, desc, eq, getTableColumns, inArray, max, notInArray, sql, type SQL } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import type { Db } from '../db/client';
import { dateColumns, toDto, toRow } from './serialize';

/** Shape shared by every resource table (see db/schema/columns.ts). */
export type RecordTable = PgTable & {
  id: PgColumn;
  externalId: PgColumn;
  agentId: PgColumn;
  syncedAt: PgColumn;
  updatedAt: PgColumn;
};

type Dto = Record<string, unknown>;

export interface ListOptions {
  where?: SQL;
  orderBy?: { column: PgColumn; dir?: 'asc' | 'desc' };
}

export interface ResourceRepository<T> {
  /** Keys that are timestamps (ISO strings on the wire). */
  readonly dateFields: ReadonlySet<string>;
  list(opts?: ListOptions): Promise<T[]>;
  get(id: string): Promise<T | null>;
  getByExternalIds(externalIds: string[]): Promise<T[]>;
  insert(dto: Dto): Promise<T>;
  update(id: string, patch: Dto): Promise<T | null>;
  remove(id: string): Promise<T | null>;
  /** Insert or update by externalId. `items` are DTOs (ISO dates) already validated. */
  upsertMany(items: Dto[], meta: { agentId: string | null; syncedAt: Date }): Promise<T[]>;
  /** Delete the agent's records whose externalId is not in `keep`; returns their ids. */
  deleteMissing(agentId: string, keep: string[]): Promise<string[]>;
  stats(): Promise<{ count: number; lastSyncAt: string | null }>;
}

/** Postgres accepts at most 65535 bind parameters per statement. */
const CHUNK = 500;

/**
 * CRUD + sync primitives over one resource table. Rows come back as DTOs (ISO
 * dates), rows go in as DTOs; conversion is driven by the table's columns.
 */
export function createResourceRepository<T>(
  db: Db,
  table: RecordTable,
  defaultOrder: ListOptions['orderBy'] = { column: table.updatedAt, dir: 'desc' },
): ResourceRepository<T> {
  const t = table as RecordTable & PgTable;
  const map = (rows: Dto[]) => rows.map((r) => toDto<T>(r));

  const excluded: Record<string, SQL> = {};
  for (const [key, col] of Object.entries(getTableColumns(t)))
    if (key !== 'id' && key !== 'externalId') excluded[key] = sql.raw(`excluded."${col.name}"`);

  return {
    dateFields: dateColumns(t),

    async list({ where, orderBy = defaultOrder } = {}) {
      const order = orderBy?.dir === 'desc' ? desc(orderBy.column) : asc(orderBy!.column);
      const rows = await db.select().from(t).where(where).orderBy(order);
      return map(rows);
    },

    async get(id) {
      const [row] = await db.select().from(t).where(eq(t.id, id)).limit(1);
      return row ? toDto<T>(row) : null;
    },

    async getByExternalIds(externalIds) {
      if (!externalIds.length) return [];
      return map(await db.select().from(t).where(inArray(t.externalId, externalIds)));
    },

    async insert(dto) {
      const [row] = await db
        .insert(t)
        .values(toRow(t, { ...dto, updatedAt: new Date() }) as never)
        .returning();
      return toDto<T>(row!);
    },

    async update(id, patch) {
      const [row] = await db
        .update(t)
        .set(toRow(t, { ...patch, updatedAt: new Date() }) as never)
        .where(eq(t.id, id))
        .returning();
      return row ? toDto<T>(row) : null;
    },

    async remove(id) {
      const [row] = await db.delete(t).where(eq(t.id, id)).returning();
      return row ? toDto<T>(row) : null;
    },

    async upsertMany(items, { agentId, syncedAt }) {
      const out: T[] = [];
      for (let i = 0; i < items.length; i += CHUNK) {
        const values = items
          .slice(i, i + CHUNK)
          .map((it) => toRow(t, { url: null, ...it, agentId, syncedAt, updatedAt: syncedAt }));
        const rows = await db
          .insert(t)
          .values(values as never)
          .onConflictDoUpdate({ target: t.externalId, set: excluded as never })
          .returning();
        out.push(...map(rows));
      }
      return out;
    },

    async deleteMissing(agentId, keep) {
      const where = keep.length
        ? and(eq(t.agentId, agentId), notInArray(t.externalId, keep))
        : eq(t.agentId, agentId);
      const rows = await db.delete(t).where(where).returning({ id: t.id });
      return rows.map((r) => r.id as string);
    },

    async stats() {
      const [row] = await db.select({ count: count(), lastSyncAt: max(t.syncedAt) }).from(t);
      const last = row?.lastSyncAt as Date | string | null | undefined;
      return {
        count: Number(row?.count ?? 0),
        lastSyncAt: last ? new Date(last).toISOString() : null,
      };
    },
  };
}
