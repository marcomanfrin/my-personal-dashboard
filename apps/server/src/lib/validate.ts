import type { z } from 'zod';
import { badRequest } from './errors';

export const formatIssues = (error: z.ZodError, prefix = '') =>
  error.issues.map((i) => ({ path: [prefix, ...i.path.map(String)].filter(Boolean).join('.'), message: i.message }));

/** Parses `data` or throws a 400 listing every issue. */
export function parse<S extends z.ZodType>(schema: S, data: unknown, what = 'Request'): z.infer<S> {
  const r = schema.safeParse(data);
  if (!r.success) throw badRequest(`${what} is invalid`, formatIssues(r.error));
  return r.data;
}

/** Throws a 400 when a PATCH body has no field. */
export function nonEmpty<T extends object>(patch: T): T {
  if (Object.keys(patch).length === 0) throw badRequest('Nothing to change');
  return patch;
}
