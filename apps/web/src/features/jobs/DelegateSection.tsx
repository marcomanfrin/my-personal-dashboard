import { JOB_KINDS, type JobKind, type Resource } from '@argus/shared';
import { useId, useState, type FormEvent } from 'react';
import { Button, Chip, Toggle } from '../../components/ui/primitives';
import { useDrawer } from '../../drawer/DrawerContext';
import { DrawerSection } from '../../drawer/DrawerShell';
import { useJobActions, useJobs } from '../../hooks/useJobs';
import { RESOURCE_NOUN } from '../../lib/labels';
import { JobStatusPill } from './JobStatus';

export interface DelegateProps {
  resource: Resource;
  recordId: string;
  /** Defaults to `record`, which needs an instruction. */
  kind?: JobKind;
  /** One-tap instructions for this kind of record. */
  presets?: string[];
  title?: string;
  cta?: string;
}

/**
 * Hands a record to an agent, in any drawer: an instruction (a preset or free text)
 * and whether to review the agent's draft first. While an agent is on it, shows
 * the job instead, with a link to review it.
 */
export function DelegateSection({
  resource,
  recordId,
  kind = 'record',
  presets = [],
  title = 'Hand it to an agent',
  cta = 'Delegate',
}: DelegateProps) {
  const { activeFor } = useJobs();
  const { delegate, delegating } = useJobActions();
  const { open } = useDrawer();
  const [instruction, setInstruction] = useState('');
  const [review, setReview] = useState(true);
  const inputId = useId();
  const active = activeFor(recordId);
  const alwaysReviewed = JOB_KINDS[kind].approval === 'always';
  const needsInstruction = JOB_KINDS[kind].target === 'any';

  if (active)
    return (
      <DrawerSection title="Agent on it">
        <div className="flex flex-wrap items-center gap-2.5">
          <JobStatusPill status={active.status} />
          {active.agentName && (
            <span className="text-[12.5px] font-semibold text-fg-3">{active.agentName}</span>
          )}
          <Button size="sm" icon="bot" className="ml-auto" onClick={() => open('job', active.id)}>
            {active.status === 'awaiting_approval' ? 'Review draft' : 'View job'}
          </Button>
        </div>
      </DrawerSection>
    );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void delegate({
      kind,
      resource,
      recordId,
      instruction: instruction.trim(),
      requiresApproval: alwaysReviewed || review,
    }).then(
      () => setInstruction(''),
      () => undefined,
    );
  };

  return (
    <DrawerSection title={title}>
      <form onSubmit={submit} className="flex flex-col gap-2.5">
        {presets.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <Chip
                key={p}
                pressed={instruction === p}
                onClick={() => setInstruction(instruction === p ? '' : p)}
              >
                {p}
              </Chip>
            ))}
          </div>
        )}
        <label className="sr-only" htmlFor={inputId}>
          Instruction for the agent
        </label>
        <textarea
          id={inputId}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder={
            needsInstruction
              ? `What should the agent do with this ${RESOURCE_NOUN[resource]}?`
              : 'Anything the agent should know (optional)'
          }
          rows={3}
          maxLength={4000}
          required={needsInstruction}
          className="min-h-[76px] w-full resize-y rounded-[10px] border border-control bg-surface-2 px-3 py-2 text-[13.5px] placeholder:text-fg-3 focus:border-accent"
        />
        <div className="flex flex-wrap items-center gap-2.5">
          {alwaysReviewed ? (
            <span className="text-[12.5px] font-semibold text-fg-3">
              You review the draft before it goes out.
            </span>
          ) : (
            <Toggle checked={review} onChange={setReview}>
              Review the draft before it acts
            </Toggle>
          )}
          <Button
            type="submit"
            variant="primary"
            size="sm"
            icon="bot"
            className="ml-auto"
            disabled={delegating || (needsInstruction && !instruction.trim())}
          >
            {cta}
          </Button>
        </div>
      </form>
    </DrawerSection>
  );
}
