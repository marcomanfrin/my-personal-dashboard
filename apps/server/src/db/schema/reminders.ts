import type { Priority } from '@command/shared';
import { boolean, pgTable, text } from 'drizzle-orm/pg-core';
import { recordColumns, ts } from './columns';

export const reminders = pgTable('reminders', {
  ...recordColumns(),
  title: text('title').notNull(),
  due: ts('due').notNull(),
  hasTime: boolean('has_time').notNull(),
  priority: text('priority').$type<Priority>().notNull(),
  category: text('category').notNull(),
  done: boolean('done').notNull(),
});
