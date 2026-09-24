import { z } from 'zod';
import { IsoDate, Priority, RecordMeta, SourceFields } from './common';

export const IssueKind = z.enum(['deploy', 'actions', 'bug', 'issue', 'security']);
export const IssueState = z.enum(['error', 'warning', 'blocked', 'success']);
export type IssueKind = z.infer<typeof IssueKind>;
export type IssueState = z.infer<typeof IssueState>;

/** A GitHub signal: failed deploy or workflow, assigned bug/issue, security alert. */
export const IssueInput = SourceFields.extend({
  kind: IssueKind,
  repo: z.string(),
  number: z.number().int().positive().nullish(),
  title: z.string(),
  detail: z.string().default(''),
  state: IssueState,
  level: Priority,
  createdAt: IsoDate,
  acknowledged: z.boolean().default(false),
});
export const Issue = IssueInput.extend(RecordMeta.shape);
export const IssuePatch = z.object({ acknowledged: z.boolean() }).partial();

export type IssueInput = z.input<typeof IssueInput>;
export type Issue = z.infer<typeof Issue>;
export type IssuePatch = z.infer<typeof IssuePatch>;
