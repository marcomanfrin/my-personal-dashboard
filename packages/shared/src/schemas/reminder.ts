import { z } from 'zod';
import { IsoDate, Priority, RecordMeta, SourceFields } from './common';

export const ReminderInput = SourceFields.extend({
  title: z.string().min(1),
  due: IsoDate,
  hasTime: z.boolean().default(false),
  priority: Priority.default('normal'),
  category: z.string().default('Inbox'),
  done: z.boolean().default(false),
});
export const Reminder = ReminderInput.extend(RecordMeta.shape);
export const ReminderPatch = z
  .object({
    title: z.string().min(1),
    due: IsoDate,
    hasTime: z.boolean(),
    priority: Priority,
    category: z.string(),
    done: z.boolean(),
  })
  .partial();
/** A reminder created by the user from the dashboard; the server assigns its externalId. */
export const ReminderCreate = ReminderInput.omit({ externalId: true, url: true });

export type ReminderInput = z.input<typeof ReminderInput>;
export type Reminder = z.infer<typeof Reminder>;
export type ReminderPatch = z.infer<typeof ReminderPatch>;
export type ReminderCreate = z.input<typeof ReminderCreate>;
