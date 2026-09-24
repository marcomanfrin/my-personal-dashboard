import { z } from 'zod';
import { RecordMeta, SourceFields } from './common';

export const ProjectInput = SourceFields.extend({
  /** Stable short key, referenced by GanttTask.projectKey (e.g. HMI). */
  key: z.string().min(1),
  name: z.string(),
  area: z.string().default(''),
  owner: z.string().default(''),
});
export const Project = ProjectInput.extend(RecordMeta.shape);

export type ProjectInput = z.input<typeof ProjectInput>;
export type Project = z.infer<typeof Project>;
