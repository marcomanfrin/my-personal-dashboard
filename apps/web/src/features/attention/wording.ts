import type { AttentionItem, DashboardData } from '@command/shared';
import type { IconName } from '../../components/ui/icons';
import { dueText, relPast } from '../../lib/format';
import { attentionIcon } from '../../lib/labels';

/** Display text of an attention item, from its reason (the domain layer sends no prose). */
export function attentionTitle(i: AttentionItem, data: DashboardData): string {
  switch (i.reason) {
    case 'review-requested': {
      const pr = data.pulls.find((p) => p.id === i.ref.id);
      return pr ? `Review #${pr.number}: ${i.title}` : `Review: ${i.title}`;
    }
    case 'gantt-delayed':
      return `${i.title} is past its end date`;
    case 'gantt-at-risk':
      return `${i.title} is behind schedule`;
    default:
      return i.title;
  }
}

export function attentionContext(i: AttentionItem): string {
  const ctx = i.progress !== undefined ? `${i.context}, ${i.progress}% done` : i.context;
  return ctx;
}

export function attentionWhen(i: AttentionItem, now: Date): string {
  if (i.reason === 'reminder-overdue') return 'Overdue';
  if (i.reason === 'gantt-delayed') return 'Delayed';
  if (i.reason === 'gantt-at-risk') return 'At risk';
  return i.when.mode === 'ago' ? relPast(i.when.at, now) : dueText(i.when.at, i.when.hasTime, now);
}

export function attentionIconFor(i: AttentionItem, data: DashboardData): IconName {
  const kind = i.ref.resource === 'issues' ? data.issues.find((x) => x.id === i.ref.id)?.kind : undefined;
  return attentionIcon(i, kind);
}
