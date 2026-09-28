import { isJobActive, type Job } from '@argus/shared';
import { useEffect, useId, useState } from 'react';
import { Button, Kv } from '../../components/ui/primitives';
import { useDrawer } from '../../drawer/DrawerContext';
import { DrawerSection, DrawerView, Prose } from '../../drawer/DrawerShell';
import { useDashboard } from '../../hooks/useDashboard';
import { useJobActions } from '../../hooks/useJobs';
import { relPast } from '../../lib/format';
import { JOB_KIND_LABEL, RESOURCE_NOUN } from '../../lib/labels';
import { JobStatusPill } from './JobStatus';

const field =
  'w-full rounded-[10px] border border-control bg-surface-2 px-3 text-[13.5px] placeholder:text-fg-3 focus:border-accent';

/** A delegated job: what was asked, where the agent is, and the draft to review when it waits on the user. */
export function JobDrawer({ job: j }: { job: Job }) {
  const { now } = useDashboard();
  const { openRecord } = useDrawer();
  const { approve, revise, reject, cancel } = useJobActions();
  const reviewing = j.status === 'awaiting_approval';

  // The editable copy of the draft, reset whenever the agent sends a new one.
  const [subject, setSubject] = useState(j.draft?.subject ?? '');
  const [body, setBody] = useState(j.draft?.body ?? '');
  const [feedback, setFeedback] = useState('');
  useEffect(() => {
    setSubject(j.draft?.subject ?? '');
    setBody(j.draft?.body ?? '');
  }, [j.draft?.subject, j.draft?.body]);
  const subjectId = useId();
  const bodyId = useId();
  const feedbackId = useId();

  const edited = reviewing && (body !== (j.draft?.body ?? '') || subject !== (j.draft?.subject ?? ''));
  const cancellable = isJobActive(j) && j.status !== 'executing';

  const foot = reviewing ? (
    <>
      <Button
        variant="primary"
        icon="check"
        disabled={!body.trim()}
        onClick={() => approve({ id: j.id, draft: edited ? { subject: subject || null, body } : undefined })}
      >
        {edited ? 'Approve with edits' : 'Approve'}
      </Button>
      <Button
        icon="refresh"
        disabled={!feedback.trim()}
        onClick={() => revise({ id: j.id, feedback: feedback.trim() })}
      >
        Request changes
      </Button>
      <Button
        variant="warn"
        icon="xCircle"
        onClick={() => reject({ id: j.id, feedback: feedback.trim() || undefined })}
      >
        Reject
      </Button>
    </>
  ) : cancellable ? (
    <Button variant="warn" icon="ban" onClick={() => cancel(j.id)}>
      Cancel job
    </Button>
  ) : undefined;

  return (
    <DrawerView kickerIcon="bot" kicker={`Agent job, ${JOB_KIND_LABEL[j.kind]}`} title={j.title} foot={foot}>
      <Kv
        rows={[
          ['Status', <JobStatusPill status={j.status} />],
          ['Agent', j.agentName ?? 'Not picked up yet'],
          ['Requested', `${relPast(j.createdAt, now)}${j.createdBy === 'nova' ? ', by Nova' : ''}`],
          ['Review', j.requiresApproval ? 'Draft reviewed before acting' : 'Acts without review'],
          !!j.finishedAt && ['Finished', relPast(j.finishedAt, now)],
        ]}
      />
      {j.resource && j.recordId && (
        <Button
          size="sm"
          icon="external"
          className="self-start"
          onClick={() => openRecord(j.resource!, j.recordId!)}
        >
          Open the {RESOURCE_NOUN[j.resource]}
        </Button>
      )}
      {j.instruction && (
        <DrawerSection title="Instruction">
          <Prose>{j.instruction}</Prose>
        </DrawerSection>
      )}
      {j.feedback && (
        <DrawerSection title="Your feedback">
          <Prose>{j.feedback}</Prose>
        </DrawerSection>
      )}
      {reviewing && j.draft ? (
        <DrawerSection title="Draft to review">
          <div className="flex flex-col gap-2">
            {j.draft.subject != null && (
              <>
                <label className="sr-only" htmlFor={subjectId}>
                  Subject
                </label>
                <input
                  id={subjectId}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={500}
                  className={`${field} h-[38px] font-semibold`}
                />
              </>
            )}
            <label className="sr-only" htmlFor={bodyId}>
              Draft
            </label>
            <textarea
              id={bodyId}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              maxLength={20_000}
              className={`${field} min-h-[180px] resize-y py-2 leading-[1.5]`}
            />
            <label className="text-[12.5px] font-bold text-fg-3" htmlFor={feedbackId}>
              Feedback for the agent (to request changes or say why you reject it)
            </label>
            <textarea
              id={feedbackId}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={2}
              maxLength={4000}
              placeholder="e.g. Shorter, and propose Friday instead"
              className={`${field} resize-y py-2`}
            />
          </div>
        </DrawerSection>
      ) : (
        j.draft && (
          <DrawerSection title={j.status === 'done' ? 'What the agent used' : 'Draft'}>
            {j.draft.subject && <p className="text-[13.5px] font-bold">{j.draft.subject}</p>}
            <Prose>{j.draft.body}</Prose>
          </DrawerSection>
        )
      )}
      {j.result && (
        <DrawerSection title={j.status === 'failed' ? 'What went wrong' : 'Outcome'}>
          <Prose>{j.result}</Prose>
        </DrawerSection>
      )}
    </DrawerView>
  );
}
