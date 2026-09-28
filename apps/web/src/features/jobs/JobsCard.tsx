import type { Job } from '@argus/shared';
import { useState, type FormEvent } from 'react';
import { Card } from '../../components/ui/Card';
import { Button, Empty, Tag, Toggle } from '../../components/ui/primitives';
import { useDrawer } from '../../drawer/DrawerContext';
import { useDashboard } from '../../hooks/useDashboard';
import { useJobActions, useJobs } from '../../hooks/useJobs';
import { cn } from '../../lib/cn';
import { relPast } from '../../lib/format';
import { JOB_KIND_LABEL } from '../../lib/labels';
import { JobStatusPill } from './JobStatus';

const FINISHED_SHOWN = 10;

/** Drafts waiting on the user first, then the rest of the queue, newest first. */
const byUrgency = (a: Job, b: Job) =>
  Number(b.status === 'awaiting_approval') - Number(a.status === 'awaiting_approval') ||
  b.createdAt.localeCompare(a.createdAt);

function JobRow({ job: j }: { job: Job }) {
  const { now } = useDashboard();
  const { open } = useDrawer();
  return (
    <li className="[&+&]:border-t [&+&]:border-line">
      <button
        type="button"
        onClick={() => open('job', j.id)}
        className="flex w-full items-start gap-3 rounded-[10px] px-1.5 py-[9px] text-left hover:bg-surface-2"
      >
        <div className="min-w-0 flex-1">
          <span
            className={cn(
              'block truncate text-sm leading-[1.35] font-semibold',
              ['rejected', 'cancelled'].includes(j.status) && 'text-fg-3 line-through',
            )}
          >
            {j.title}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-2.5">
            <Tag>{JOB_KIND_LABEL[j.kind]}</Tag>
            {j.agentName && <Tag icon="bot">{j.agentName}</Tag>}
            <Tag icon="clock">{relPast(j.updatedAt, now)}</Tag>
          </span>
        </div>
        <JobStatusPill status={j.status} />
      </button>
    </li>
  );
}

/** A free-form request, not tied to a record: any agent may take it. */
function NewJobForm() {
  const { delegate, delegating } = useJobActions();
  const [instruction, setInstruction] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = instruction.trim();
    if (!text) return;
    void delegate({ kind: 'free', instruction: text, requiresApproval: true }).then(
      () => setInstruction(''),
      () => undefined,
    );
  };
  return (
    <form onSubmit={submit} className="mt-3 flex gap-2 max-[380px]:flex-wrap">
      <label className="sr-only" htmlFor="job-new">
        New request for an agent
      </label>
      <input
        id="job-new"
        type="text"
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        placeholder="Ask an agent to do something"
        autoComplete="off"
        maxLength={4000}
        className="h-[38px] min-w-0 flex-1 rounded-[10px] border border-control bg-surface-2 px-3 placeholder:text-fg-3 focus:border-accent max-[380px]:basis-full"
      />
      <Button type="submit" variant="primary" icon="bot" disabled={delegating || !instruction.trim()}>
        Delegate
      </Button>
    </form>
  );
}

/** The work handed to agents: what they are on, what waits for review, what they finished. */
export function JobsCard({ className }: { className?: string }) {
  const { jobs, active, awaiting } = useJobs();
  const [showFinished, setShowFinished] = useState(false);
  const finished = jobs.filter((j) => !active.includes(j)).slice(0, FINISHED_SHOWN);
  const list = [...active].sort(byUrgency);

  return (
    <Card
      id="agents"
      title="Agent jobs"
      icon="bot"
      className={className}
      sub={
        <>
          <b>{active.length}</b> in progress
          {awaiting.length > 0 && (
            <>
              , <b className="text-high!">{awaiting.length} to review</b>
            </>
          )}
        </>
      }
      tools={
        <Toggle checked={showFinished} onChange={setShowFinished}>
          Finished
        </Toggle>
      }
    >
      <ul className="flex flex-col">
        {list.map((j) => (
          <JobRow key={j.id} job={j} />
        ))}
        {!list.length && <Empty>No agent is on anything. Delegate from any widget, or ask below.</Empty>}
      </ul>
      {showFinished && finished.length > 0 && (
        <>
          <h3 className="mt-3 mb-1 text-[12.5px] font-bold text-fg-3">Recently finished</h3>
          <ul className="flex flex-col">
            {finished.map((j) => (
              <JobRow key={j.id} job={j} />
            ))}
          </ul>
        </>
      )}
      <NewJobForm />
    </Card>
  );
}
