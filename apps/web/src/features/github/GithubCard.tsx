import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Chip, ChipRail, Empty, Segmented, ShowMore } from '../../components/ui/primitives';
import { useDashboard } from '../../hooks/useDashboard';
import { LIST_PREVIEW } from '../../lib/config';
import { PR_FILTERS, PR_SORTS, sortIssues, type PrFilterId, type PrSortId } from './filters';
import { IssueRow, PrRow } from './rows';

type Tab = 'prs' | 'issues';

export function GithubCard({ className }: { className?: string }) {
  const { data } = useDashboard();
  const [tab, setTab] = useState<Tab>('prs');
  const openIssues = data.issues.filter((i) => !i.acknowledged);
  const failing = openIssues.filter((i) => i.state === 'error').length;
  const review = data.pulls.filter((p) => p.reviewRequested).length;

  return (
    <Card
      id="github"
      sources={['pulls', 'issues']}
      title="GitHub"
      icon="git"
      className={className}
      sub={
        <>
          <b>{review}</b> to review, <b>{failing}</b> failing
        </>
      }
      tools={
        <Segmented
          label="GitHub view"
          value={tab}
          onChange={setTab}
          options={[
            { id: 'prs', label: 'PRs', count: data.pulls.length },
            { id: 'issues', label: 'Errors', count: openIssues.length },
          ]}
        />
      }
    >
      {tab === 'prs' ? <PullRequests /> : <Issues />}
    </Card>
  );
}

function PullRequests() {
  const { data, now } = useDashboard();
  const [filter, setFilter] = useState<PrFilterId>('all');
  const [sort, setSort] = useState<PrSortId>('priority');
  const f = PR_FILTERS.find((x) => x.id === filter)!;
  const list = data.pulls.filter(f.test).sort(PR_SORTS[sort].compare(now));

  return (
    <>
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <ChipRail label="Filter pull requests" className="m-[-2px] min-w-0 flex-[1_1_200px]">
          {PR_FILTERS.map((x) => (
            <Chip key={x.id} pressed={x.id === filter} count={data.pulls.filter(x.test).length} onClick={() => setFilter(x.id)}>
              {x.label}
            </Chip>
          ))}
        </ChipRail>
        <label>
          <span className="sr-only">Sort pull requests</span>
          <select className="select" value={sort} onChange={(e) => setSort(e.target.value as PrSortId)}>
            {Object.entries(PR_SORTS).map(([id, s]) => (
              <option key={id} value={id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ul className="flex flex-col">
        {list.map((p) => (
          <PrRow key={p.id} pr={p} />
        ))}
        {!list.length && <Empty>No pull requests match. Pick another filter.</Empty>}
      </ul>
    </>
  );
}

function Issues() {
  const { data } = useDashboard();
  const [expanded, setExpanded] = useState(false);
  const list = sortIssues(data.issues);
  const shown = expanded ? list : list.slice(0, LIST_PREVIEW);
  return (
    <>
      <ul className="flex flex-col">
        {shown.map((i) => (
          <IssueRow key={i.id} issue={i} />
        ))}
        {!shown.length && <Empty>No errors. All green.</Empty>}
      </ul>
      <ShowMore total={list.length} shown={shown.length} expanded={expanded} onToggle={() => setExpanded((x) => !x)} />
    </>
  );
}
