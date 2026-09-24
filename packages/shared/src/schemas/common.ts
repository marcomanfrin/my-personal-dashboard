import { z } from 'zod';

export const Priority = z.enum(['critical', 'high', 'medium', 'low', 'normal']);
export type Priority = z.infer<typeof Priority>;

/** ISO 8601 timestamp with offset, e.g. 2026-09-24T09:00:00.000Z. The only date format on the wire. */
export const IsoDate = z.iso.datetime({ offset: true });

/** Every kind of data an agent can write. Also the URL segment of its REST routes. */
export const RESOURCES = ['emails', 'events', 'pulls', 'issues', 'reminders', 'tasks', 'projects', 'gantt'] as const;
export const Resource = z.enum(RESOURCES);
export type Resource = z.infer<typeof Resource>;

/** Fields an agent sends for any record: its identity in the source system. */
export const SourceFields = z.object({
  externalId: z.string().min(1).max(512),
  url: z.url().nullish(),
});

/** Fields the server adds to every stored record. Agents never send these. */
export const RecordMeta = z.object({
  id: z.uuid(),
  agentId: z.uuid().nullable(),
  syncedAt: IsoDate.nullable(),
  updatedAt: IsoDate,
});
export type RecordMeta = z.infer<typeof RecordMeta>;
