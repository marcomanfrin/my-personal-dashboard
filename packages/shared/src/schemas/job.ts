import { z } from 'zod';
import { IsoDate, Resource } from './common';

/**
 * What the user asks an agent to do. `target` is the resource the kind works on:
 * a fixed one, `any` (the request names it) or none (a free-form request). The
 * approval mode says whether the agent must show a draft and wait for the user
 * before acting on the real system: `always`, or by default (the user can opt out).
 */
export const JOB_KINDS = {
  /** Carry out a Trello card: the card moves to Doing when claimed and to Done when finished. */
  'task.do': { target: 'tasks', approval: 'default' },
  /** Reply to an email, which is marked done when sent. Always reviewed: it leaves the building. */
  'email.reply': { target: 'emails', approval: 'always' },
  /** Whatever the instruction says, about one record of any resource (a PR to review, an event to prepare…). */
  record: { target: 'any', approval: 'default' },
  /** Anything else, described in the instruction. */
  free: { target: null, approval: 'default' },
} as const satisfies Record<string, { target: Resource | 'any' | null; approval: 'always' | 'default' }>;

export const JobKind = z.enum(
  Object.keys(JOB_KINDS) as [keyof typeof JOB_KINDS, ...(keyof typeof JOB_KINDS)[]],
);
export type JobKind = z.infer<typeof JobKind>;

/**
 * pending → claimed → (awaiting_approval → approved → executing →) done | failed.
 * The user can reject a draft, send it back with feedback (→ pending) or cancel
 * a job that is not finished yet.
 */
export const JobStatus = z.enum([
  'pending',
  'claimed',
  'awaiting_approval',
  'approved',
  'executing',
  'done',
  'failed',
  'rejected',
  'cancelled',
]);
export type JobStatus = z.infer<typeof JobStatus>;

/** Statuses a job never leaves. */
export const FINISHED_JOB_STATUSES = [
  'done',
  'failed',
  'rejected',
  'cancelled',
] as const satisfies JobStatus[];
export const isJobActive = (j: { status: JobStatus }) =>
  !(FINISHED_JOB_STATUSES as readonly JobStatus[]).includes(j.status);

/** What the agent proposes to do, e.g. the reply it would send. The user may edit it before approving. */
export const JobDraft = z.object({
  subject: z.string().max(500).nullish(),
  body: z.string().min(1).max(20_000),
});
export type JobDraft = z.infer<typeof JobDraft>;

export const JobOrigin = z.enum(['user', 'nova']);
export type JobOrigin = z.infer<typeof JobOrigin>;

export const Job = z.object({
  id: z.uuid(),
  kind: JobKind,
  /** The target record, when the kind has one. */
  resource: Resource.nullable(),
  recordId: z.uuid().nullable(),
  externalId: z.string().nullable(),
  /** Short label: the card title, the email subject, or the start of the instruction. */
  title: z.string(),
  instruction: z.string(),
  requiresApproval: z.boolean(),
  status: JobStatus,
  draft: JobDraft.nullable(),
  /** The user's note when sending a draft back or rejecting it. */
  feedback: z.string().nullable(),
  /** The agent's outcome: what it did, or why it failed. */
  result: z.string().nullable(),
  agentId: z.uuid().nullable(),
  agentName: z.string().nullable(),
  createdBy: JobOrigin,
  createdAt: IsoDate,
  updatedAt: IsoDate,
  finishedAt: IsoDate.nullable(),
});
export type Job = z.infer<typeof Job>;

/** The resource a job of this kind targets, given the one named by the request (for `record`). */
export function jobResource(kind: JobKind, requested?: Resource | null): Resource | null {
  const { target } = JOB_KINDS[kind];
  return target === 'any' ? (requested ?? null) : target;
}

/**
 * POST /api/jobs. Kinds with a target need `recordId`; `record` also needs `resource`.
 * `requiresApproval` defaults to true and cannot be turned off for `always` kinds.
 */
export const JobCreate = z
  .object({
    kind: JobKind,
    resource: Resource.nullish(),
    recordId: z.uuid().nullish(),
    instruction: z.string().trim().max(4000).default(''),
    requiresApproval: z.boolean().optional(),
  })
  .superRefine((j, ctx) => {
    const { target } = JOB_KINDS[j.kind];
    const issue = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });
    if (target === 'any' && !j.resource) issue('resource', `Required by ${j.kind}`);
    if (target !== 'any' && j.resource && j.resource !== target)
      issue('resource', `${j.kind} works on ${target ?? 'no record'}`);
    if (target && !j.recordId) issue('recordId', `Required by ${j.kind}`);
    if (!target && j.recordId) issue('recordId', `${j.kind} has no target`);
    if ((!target || target === 'any') && !j.instruction) issue('instruction', 'Say what to do');
  });
export type JobCreate = z.input<typeof JobCreate>;

export const JobQuery = z.object({
  status: JobStatus.optional(),
  /** Only jobs that are not finished. */
  active: z.stringbool().optional(),
  recordId: z.uuid().optional(),
});
export type JobQuery = z.infer<typeof JobQuery>;

/** POST /api/jobs/:id/approve: the draft as the agent should use it, edited or not. */
export const JobApprove = z.object({ draft: JobDraft.optional() });
/** POST /api/jobs/:id/revise and /reject. Feedback is required to revise. */
export const JobRevise = z.object({ feedback: z.string().trim().min(1).max(4000) });
export const JobReject = z.object({ feedback: z.string().trim().max(4000).nullish() });
export type JobApprove = z.infer<typeof JobApprove>;
export type JobRevise = z.infer<typeof JobRevise>;
export type JobReject = z.infer<typeof JobReject>;

/** POST /api/jobs/claim. Without `kinds`, any kind the agent's scopes cover. */
export const JobClaim = z.object({
  kinds: z.array(JobKind).min(1).optional(),
  limit: z.number().int().min(1).max(50).default(5),
});
export type JobClaim = z.input<typeof JobClaim>;

/** PATCH /api/jobs/:id by the agent holding the job. */
export const JobReport = z.discriminatedUnion('status', [
  z.object({ status: z.literal('awaiting_approval'), draft: JobDraft }),
  z.object({ status: z.literal('done'), result: z.string().max(4000).nullish(), draft: JobDraft.nullish() }),
  z.object({ status: z.literal('failed'), result: z.string().min(1).max(4000) }),
]);
export type JobReport = z.infer<typeof JobReport>;
