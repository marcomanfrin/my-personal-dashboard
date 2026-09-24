import type { EventCategory } from '@argus/shared';
import { boolean, index, pgTable, text } from 'drizzle-orm/pg-core';
import { recordColumns, ts } from './columns';

export const events = pgTable(
  'events',
  {
    ...recordColumns(),
    title: text('title').notNull(),
    start: ts('start').notNull(),
    end: ts('end').notNull(),
    category: text('category').$type<EventCategory>().notNull(),
    location: text('location'),
    videoLink: text('video_link'),
    important: boolean('important').notNull(),
    attendees: text('attendees').array().notNull(),
    notes: text('notes'),
  },
  (t) => [index('events_start_idx').on(t.start)],
);
