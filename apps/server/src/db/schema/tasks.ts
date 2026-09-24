import type { TaskColumn } from '@command/shared';
import { jsonb, pgTable, text } from 'drizzle-orm/pg-core';
import { recordColumns, ts } from './columns';

/** Trello cards. */
export const tasks = pgTable('tasks', {
  ...recordColumns(),
  title: text('title').notNull(),
  column: text('column').$type<TaskColumn>().notNull(),
  board: text('board').notNull(),
  labels: text('labels').array().notNull(),
  due: ts('due'),
  checklist: jsonb('checklist').$type<{ done: number; total: number }>(),
});
