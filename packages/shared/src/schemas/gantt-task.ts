import { z } from 'zod';
import { IsoDate, RecordMeta, SourceFields } from './common';

/** A task of the company plan. The store holds everyone's tasks; the dashboard shows the owner's. */
export const GanttTaskInput = SourceFields.extend({
  projectKey: z.string(),
  /** Ticket key, e.g. HMI-42. Referenced by dependsOn. */
  key: z.string().min(1),
  tags: z.array(z.string()).default([]),
  title: z.string(),
  assignee: z.string(),
  start: IsoDate,
  end: IsoDate,
  deadline: IsoDate.nullish(),
  progress: z.number().min(0).max(100),
  dependsOn: z.array(z.string()).default([]),
});
export const GanttTask = GanttTaskInput.extend(RecordMeta.shape);
export const GanttTaskPatch = z
  .object({ start: IsoDate, end: IsoDate, progress: z.number().min(0).max(100) })
  .partial();

export type GanttTaskInput = z.input<typeof GanttTaskInput>;
export type GanttTask = z.infer<typeof GanttTask>;
export type GanttTaskPatch = z.infer<typeof GanttTaskPatch>;
