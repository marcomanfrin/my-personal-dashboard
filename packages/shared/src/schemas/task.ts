import { z } from 'zod';
import { IsoDate, RecordMeta, SourceFields } from './common';

export const TaskColumn = z.enum(['todo', 'doing', 'review', 'done']);
export type TaskColumn = z.infer<typeof TaskColumn>;

/** A Trello card. */
export const TaskInput = SourceFields.extend({
  title: z.string(),
  column: TaskColumn,
  board: z.string(),
  labels: z.array(z.string()).default([]),
  due: IsoDate.nullish(),
  checklist: z
    .object({ done: z.number().int().nonnegative(), total: z.number().int().nonnegative() })
    .nullish(),
});
export const Task = TaskInput.extend(RecordMeta.shape);
export const TaskPatch = z.object({ column: TaskColumn }).partial();

export type TaskInput = z.input<typeof TaskInput>;
export type Task = z.infer<typeof Task>;
export type TaskPatch = z.infer<typeof TaskPatch>;
