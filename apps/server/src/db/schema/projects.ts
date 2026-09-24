import { pgTable, text } from 'drizzle-orm/pg-core';
import { recordColumns } from './columns';

export const projects = pgTable('projects', {
  ...recordColumns(),
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  area: text('area').notNull(),
  owner: text('owner').notNull(),
});
