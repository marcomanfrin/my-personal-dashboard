import type { ActionStatus, ActionType, Resource } from '@argus/shared';
import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { agents } from './agents';

/** Outbox of user changes waiting to be applied to the real systems by agents. */
export const actions = pgTable(
  'actions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    resource: text('resource').$type<Resource>().notNull(),
    type: text('type').$type<ActionType>().notNull(),
    /** Not a foreign key: it points into the table named by `resource`, and survives deletes. */
    recordId: uuid('record_id').notNull(),
    externalId: text('external_id').notNull(),
    changes: jsonb('changes').$type<Record<string, unknown>>().notNull(),
    previous: jsonb('previous').$type<Record<string, unknown>>(),
    status: text('status').$type<ActionStatus>().notNull().default('pending'),
    result: text('result'),
    /** The agent that claimed it. */
    agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('actions_resource_status_idx').on(t.resource, t.status, t.createdAt),
    index('actions_external_idx').on(t.resource, t.externalId),
  ],
);
