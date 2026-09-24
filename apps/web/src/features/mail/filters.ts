import { byLevel, ms, needsAction, type Email } from '@command/shared';

export type MailFilterId = 'action' | 'urgent' | 'needs-reply' | 'fyi' | 'waiting' | 'archived';

export const MAIL_FILTERS: { id: MailFilterId; label: string; test: (e: Email) => boolean }[] = [
  { id: 'action', label: 'Needs action', test: needsAction },
  { id: 'urgent', label: 'Urgent', test: (e) => e.category === 'urgent' },
  { id: 'needs-reply', label: 'Needs reply', test: (e) => e.category === 'needs-reply' },
  { id: 'fyi', label: 'FYI', test: (e) => e.category === 'fyi' },
  { id: 'waiting', label: 'Waiting', test: (e) => e.category === 'waiting' },
  { id: 'archived', label: 'Archived', test: (e) => e.category === 'archived' },
];

const BY_PRIORITY = new Set<MailFilterId>(['action', 'urgent', 'needs-reply']);

/** Actionable views by priority then newest; the others newest first. */
export function sortMail(list: Email[], filter: MailFilterId): Email[] {
  const newest = (a: Email, b: Email) => ms(b.receivedAt) - ms(a.receivedAt);
  return [...list].sort(BY_PRIORITY.has(filter) ? (a, b) => byLevel(a.priority, b.priority) || newest(a, b) : newest);
}
