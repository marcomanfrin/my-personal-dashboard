import { z } from 'zod';
import { IsoDate, Resource } from './common';

export const Agent = z.object({
  id: z.uuid(),
  name: z.string(),
  /** Resources this agent may ingest and whose actions it may claim. */
  scopes: z.array(Resource),
  createdAt: IsoDate,
  lastSeenAt: IsoDate.nullable(),
});
export type Agent = z.infer<typeof Agent>;

export const AgentRunStatus = z.enum(['running', 'success', 'error']);
export type AgentRunStatus = z.infer<typeof AgentRunStatus>;

export const AgentRun = z.object({
  id: z.uuid(),
  agentId: z.uuid(),
  resource: Resource.nullable(),
  status: AgentRunStatus,
  startedAt: IsoDate,
  finishedAt: IsoDate.nullable(),
  stats: z.object({ upserted: z.number(), deleted: z.number() }),
  /** Free text the agent writes about what it did or found. */
  summary: z.string().nullable(),
  error: z.string().nullable(),
});
export type AgentRun = z.infer<typeof AgentRun>;

export const AgentRunStart = z.object({ resource: Resource.nullish(), summary: z.string().nullish() });
export const AgentRunFinish = z.object({
  status: z.enum(['success', 'error']),
  summary: z.string().nullish(),
  error: z.string().nullish(),
});
export type AgentRunStart = z.infer<typeof AgentRunStart>;
export type AgentRunFinish = z.infer<typeof AgentRunFinish>;

export const IngestMode = z.enum(['merge', 'replace']);
export const IngestBody = z.object({
  runId: z.uuid().nullish(),
  /** merge: upsert only. replace: also delete this agent's records missing from `items` (full sync). */
  mode: IngestMode.default('merge'),
  /** Validated against the resource schema by the server. */
  items: z.array(z.unknown()).max(5000),
});
export type IngestBody = z.input<typeof IngestBody>;

export const IngestResult = z.object({
  upserted: z.number(),
  deleted: z.number(),
  /** Per externalId, fields kept as they are because a user action on them is still being propagated. */
  protectedFields: z.record(z.string(), z.array(z.string())),
});
export type IngestResult = z.infer<typeof IngestResult>;
