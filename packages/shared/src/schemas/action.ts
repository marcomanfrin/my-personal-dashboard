import { z } from 'zod';
import { IsoDate, Resource } from './common';

export const ActionType = z.enum(['create', 'update', 'delete']);
export const ActionStatus = z.enum(['pending', 'claimed', 'done', 'failed']);
export type ActionType = z.infer<typeof ActionType>;
export type ActionStatus = z.infer<typeof ActionStatus>;

/**
 * A change the user made in the dashboard, queued for the agent that owns the
 * resource so it can apply it to the real system (outbox pattern).
 */
export const Action = z.object({
  id: z.uuid(),
  resource: Resource,
  type: ActionType,
  recordId: z.uuid(),
  externalId: z.string(),
  changes: z.record(z.string(), z.unknown()),
  previous: z.record(z.string(), z.unknown()).nullable(),
  status: ActionStatus,
  result: z.string().nullable(),
  agentId: z.uuid().nullable(),
  createdAt: IsoDate,
  updatedAt: IsoDate,
});
export type Action = z.infer<typeof Action>;

export const ActionClaim = z.object({
  resource: Resource,
  limit: z.number().int().min(1).max(100).default(10),
});
export const ActionComplete = z.object({ status: z.enum(['done', 'failed']), result: z.string().nullish() });
export const ActionQuery = z.object({ resource: Resource.optional(), status: ActionStatus.optional() });
export type ActionClaim = z.input<typeof ActionClaim>;
export type ActionComplete = z.infer<typeof ActionComplete>;
export type ActionQuery = z.infer<typeof ActionQuery>;
