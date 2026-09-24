import type { MailCategory, Priority } from '@command/shared';
import { boolean, index, jsonb, pgTable, text } from 'drizzle-orm/pg-core';
import { recordColumns, ts } from './columns';

export const emails = pgTable(
  'emails',
  {
    ...recordColumns(),
    from: jsonb('from').$type<{ name: string; org: string; address: string }>().notNull(),
    subject: text('subject').notNull(),
    preview: text('preview').notNull(),
    body: text('body').notNull(),
    receivedAt: ts('received_at').notNull(),
    category: text('category').$type<MailCategory>().notNull(),
    priority: text('priority').$type<Priority>().notNull(),
    attachments: text('attachments').array().notNull(),
    deadline: ts('deadline'),
    read: boolean('read').notNull(),
    done: boolean('done').notNull(),
  },
  (t) => [index('emails_received_idx').on(t.receivedAt)],
);
