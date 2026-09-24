import type { AgentRunStatus, Resource } from '@argus/shared';
import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const agents = pgTable('agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  /** sha256 of the bearer token; the token itself is never stored. */
  tokenHash: text('token_hash').notNull().unique(),
  scopes: text('scopes').array().$type<Resource[]>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
});

export const agentRuns = pgTable(
  'agent_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    resource: text('resource').$type<Resource>(),
    status: text('status').$type<AgentRunStatus>().notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    stats: jsonb('stats').$type<{ upserted: number; deleted: number }>().notNull(),
    summary: text('summary'),
    error: text('error'),
  },
  (t) => [index('agent_runs_resource_started_idx').on(t.resource, t.startedAt)],
);
