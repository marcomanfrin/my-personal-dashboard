import { z } from 'zod';
import { IsoDate, Priority, RecordMeta, SourceFields } from './common';

export const PullRequestStatus = z.enum(['open', 'draft', 'blocked', 'changes-requested']);
export type PullRequestStatus = z.infer<typeof PullRequestStatus>;

export const PullRequestInput = SourceFields.extend({
  repo: z.string(),
  number: z.number().int().positive(),
  title: z.string(),
  author: z.string(),
  status: PullRequestStatus,
  checks: z.object({
    total: z.number().int().nonnegative(),
    passed: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    pending: z.number().int().nonnegative(),
    failedNames: z.array(z.string()).default([]),
  }),
  reviewRequested: z.boolean().default(false),
  involved: z.boolean().default(true),
  createdAt: IsoDate,
  priority: Priority.default('normal'),
  blockedBy: z.string().nullish(),
});
export const PullRequest = PullRequestInput.extend(RecordMeta.shape);
export const PullRequestPatch = z.object({ reviewRequested: z.boolean() }).partial();

export type PullRequestInput = z.input<typeof PullRequestInput>;
export type PullRequest = z.infer<typeof PullRequest>;
export type PullRequestPatch = z.infer<typeof PullRequestPatch>;
