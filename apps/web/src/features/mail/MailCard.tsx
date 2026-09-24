import { needsAction } from '@command/shared';
import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Chip, ChipRail, Empty, ShowMore } from '../../components/ui/primitives';
import { useDashboard } from '../../hooks/useDashboard';
import { LIST_PREVIEW } from '../../lib/config';
import { MAIL_FILTERS, sortMail, type MailFilterId } from './filters';
import { MailRow } from './MailRow';

export function MailCard({ className }: { className?: string }) {
  const { data } = useDashboard();
  const [filter, setFilter] = useState<MailFilterId>('action');
  const [expanded, setExpanded] = useState(false);

  const active = MAIL_FILTERS.find((f) => f.id === filter)!;
  const list = sortMail(data.emails.filter(active.test), filter);
  const shown = expanded ? list : list.slice(0, LIST_PREVIEW);
  const actionCount = data.emails.filter(needsAction).length;

  return (
    <Card
      id="mail"
      title="Mail triage"
      icon="mail"
      className={className}
      sub={actionCount ? <><b>{actionCount}</b> need your attention</> : 'Nothing needs a reply'}
    >
      <ChipRail label="Filter mail">
        {MAIL_FILTERS.map((f) => (
          <Chip
            key={f.id}
            pressed={f.id === filter}
            count={data.emails.filter(f.test).length}
            onClick={() => {
              setFilter(f.id);
              setExpanded(false);
            }}
          >
            {f.label}
          </Chip>
        ))}
      </ChipRail>
      <ul className="flex flex-col">
        {shown.map((e) => (
          <MailRow key={e.id} email={e} />
        ))}
        {!shown.length && <Empty>No mail in {active.label}. Try another filter.</Empty>}
      </ul>
      <ShowMore total={list.length} shown={shown.length} expanded={expanded} onToggle={() => setExpanded((x) => !x)} />
    </Card>
  );
}
