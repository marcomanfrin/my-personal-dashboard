import type { IssueKind, IssueState, Priority } from '@argus/shared';
import { boolean, integer, pgTable, text } from 'drizzle-orm/pg-core';
import { recordColumns, ts } from './columns';

export const issues = pgTable('issues', {
  ...recordColumns(),
  kind: text('kind').$type<IssueKind>().notNull(),
  repo: text('repo').notNull(),
  number: integer('number'),
  title: text('title').notNull(),
  detail: text('detail').notNull(),
  state: text('state').$type<IssueState>().notNull(),
  level: text('level').$type<Priority>().notNull(),
  createdAt: ts('created_at').notNull(),
  acknowledged: boolean('acknowledged').notNull(),
});
