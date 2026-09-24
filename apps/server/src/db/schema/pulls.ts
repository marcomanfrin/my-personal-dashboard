import type { Priority, PullRequestStatus } from '@command/shared';
import { boolean, integer, jsonb, pgTable, text } from 'drizzle-orm/pg-core';
import { recordColumns, ts } from './columns';

export const pulls = pgTable('pulls', {
  ...recordColumns(),
  repo: text('repo').notNull(),
  number: integer('number').notNull(),
  title: text('title').notNull(),
  author: text('author').notNull(),
  status: text('status').$type<PullRequestStatus>().notNull(),
  checks: jsonb('checks')
    .$type<{ total: number; passed: number; failed: number; pending: number; failedNames: string[] }>()
    .notNull(),
  reviewRequested: boolean('review_requested').notNull(),
  involved: boolean('involved').notNull(),
  createdAt: ts('created_at').notNull(),
  priority: text('priority').$type<Priority>().notNull(),
  blockedBy: text('blocked_by'),
});
