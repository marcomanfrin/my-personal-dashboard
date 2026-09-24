import { z } from 'zod';
import { IsoDate, Priority, RecordMeta, SourceFields } from './common';

export const MailCategory = z.enum(['urgent', 'needs-reply', 'fyi', 'waiting', 'archived']);
export type MailCategory = z.infer<typeof MailCategory>;

export const EmailInput = SourceFields.extend({
  from: z.object({ name: z.string(), org: z.string().default(''), address: z.string() }),
  subject: z.string(),
  preview: z.string().default(''),
  body: z.string().default(''),
  receivedAt: IsoDate,
  category: MailCategory,
  priority: Priority.default('normal'),
  attachments: z.array(z.string()).default([]),
  deadline: IsoDate.nullish(),
  read: z.boolean().default(false),
  done: z.boolean().default(false),
});
export const Email = EmailInput.extend(RecordMeta.shape);
/** What the user can change from the dashboard. */
export const EmailPatch = z.object({ read: z.boolean(), done: z.boolean(), category: MailCategory }).partial();

export type EmailInput = z.input<typeof EmailInput>;
export type Email = z.infer<typeof Email>;
export type EmailPatch = z.infer<typeof EmailPatch>;
