import { text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { agents } from './agents';

/** Columns shared by every resource table (see RecordMeta + SourceFields in @argus/shared). */
export const recordColumns = () => ({
  id: uuid('id').primaryKey().defaultRandom(),
  externalId: text('external_id').notNull().unique(),
  url: text('url'),
  agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'set null' }),
  syncedAt: timestamp('synced_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const ts = (name: string) => timestamp(name, { withTimezone: true });
