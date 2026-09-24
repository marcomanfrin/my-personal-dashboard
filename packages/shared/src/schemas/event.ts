import { z } from 'zod';
import { IsoDate, RecordMeta, SourceFields } from './common';

export const EventCategory = z.enum(['meeting', 'focus', 'personal', 'study', 'deadline']);
export type EventCategory = z.infer<typeof EventCategory>;

export const CalendarEventInput = SourceFields.extend({
  title: z.string(),
  start: IsoDate,
  end: IsoDate,
  category: EventCategory,
  location: z.string().nullish(),
  videoLink: z.string().nullish(),
  important: z.boolean().default(false),
  attendees: z.array(z.string()).default([]),
  notes: z.string().nullish(),
});
export const CalendarEvent = CalendarEventInput.extend(RecordMeta.shape);

export type CalendarEventInput = z.input<typeof CalendarEventInput>;
export type CalendarEvent = z.infer<typeof CalendarEvent>;
