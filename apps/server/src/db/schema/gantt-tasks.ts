import { doublePrecision, index, pgTable, text } from 'drizzle-orm/pg-core';
import { recordColumns, ts } from './columns';

export const ganttTasks = pgTable(
  'gantt_tasks',
  {
    ...recordColumns(),
    /** References projects.key; not a foreign key because agents may sync the two in any order. */
    projectKey: text('project_key').notNull(),
    key: text('key').notNull().unique(),
    tags: text('tags').array().notNull(),
    title: text('title').notNull(),
    assignee: text('assignee').notNull(),
    start: ts('start').notNull(),
    end: ts('end').notNull(),
    deadline: ts('deadline'),
    progress: doublePrecision('progress').notNull(),
    dependsOn: text('depends_on').array().notNull(),
  },
  (t) => [index('gantt_tasks_assignee_idx').on(t.assignee)],
);
