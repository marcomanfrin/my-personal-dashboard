import type { JobDraft, JobKind, JobOrigin, JobStatus, Resource } from '@argus/shared';
import { boolean, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { agents } from './agents';

/** Work the user delegated to agents: the reverse of ingest, from the dashboard to the real systems. */
export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kind: text('kind').$type<JobKind>().notNull(),
    resource: text('resource').$type<Resource>(),
    /** Not a foreign key: it points into the table named by `resource`, and survives deletes. */
    recordId: uuid('record_id'),
    externalId: text('external_id'),
    title: text('title').notNull(),
    instruction: text('instruction').notNull(),
    requiresApproval: boolean('requires_approval').notNull(),
    status: text('status').$type<JobStatus>().notNull().default('pending'),
    draft: jsonb('draft').$type<JobDraft>(),
    feedback: text('feedback'),
    result: text('result'),
    /** The agent holding (or that last held) the job. */
    agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'set null' }),
    createdBy: text('created_by').$type<JobOrigin>().notNull().default('user'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
  },
  (t) => [
    index('jobs_status_created_idx').on(t.status, t.createdAt),
    index('jobs_record_idx').on(t.recordId),
  ],
);
