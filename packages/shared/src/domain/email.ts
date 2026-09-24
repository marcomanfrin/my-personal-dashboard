import type { EmailPatch } from '../schemas/email';

/**
 * Keeps `done` and `category` consistent: marking done archives (and reads) the
 * mail; moving it to Archived marks it done, anywhere else reopens it.
 * Applied by the server on PATCH and by the client for optimistic updates.
 */
export function normalizeEmailPatch(p: EmailPatch): EmailPatch {
  if (p.done === true) return { read: true, category: 'archived', ...p };
  if (p.category && p.done === undefined) return { ...p, done: p.category === 'archived' };
  return p;
}
