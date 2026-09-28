import { isJobActive, type Job, type JobDraft } from '@argus/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { endpoints } from '../api/endpoints';
import { queryKeys } from '../api/queryClient';
import { useToast } from '../components/feedback/Toast';
import { emitReaction } from '../lib/reactions';

const NO_JOBS: Job[] = [];

/** Every job, newest first (the server keeps the latest 200). Refreshed by `job.updated` on the stream. */
export function useJobs() {
  const q = useQuery({ queryKey: queryKeys.jobs, queryFn: endpoints.jobs });
  const jobs = q.data ?? NO_JOBS;
  return useMemo(() => {
    const active = jobs.filter(isJobActive);
    return {
      jobs,
      active,
      awaiting: active.filter((j) => j.status === 'awaiting_approval'),
      isLoading: q.isLoading,
      /** The unfinished job on a record, if an agent is on it. */
      activeFor: (recordId: string) => active.find((j) => j.recordId === recordId),
      /** The most recent job on a record, finished or not. */
      latestFor: (recordId: string) => jobs.find((j) => j.recordId === recordId),
    };
  }, [jobs, q.isLoading]);
}

/** Delegating and reviewing jobs. Each change refetches the list; the stream keeps it fresh afterwards. */
export function useJobActions() {
  const qc = useQueryClient();
  const toast = useToast();

  /** Shared handlers: the returned job replaces its copy in the list at once. */
  const handlers = (done: string) => ({
    onSuccess: (job: Job) => {
      qc.setQueryData<Job[]>(queryKeys.jobs, (prev = []) =>
        prev.some((j) => j.id === job.id) ? prev.map((j) => (j.id === job.id ? job : j)) : [job, ...prev],
      );
      emitReaction('working');
      toast.show(done);
    },
    onError: (err: Error) => {
      emitReaction('failed');
      toast.error(`Couldn't update the job: ${err.message}`);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.jobs }),
  });

  const create = useMutation({ mutationFn: endpoints.createJob, ...handlers('Handed to an agent') });
  const approve = useMutation({
    mutationFn: ({ id, draft }: { id: string; draft?: JobDraft }) => endpoints.approveJob(id, { draft }),
    ...handlers('Approved: the agent will carry it out'),
  });
  const revise = useMutation({
    mutationFn: ({ id, feedback }: { id: string; feedback: string }) => endpoints.reviseJob(id, { feedback }),
    ...handlers('Sent back to the agent'),
  });
  const reject = useMutation({
    mutationFn: ({ id, feedback }: { id: string; feedback?: string }) =>
      endpoints.rejectJob(id, { feedback }),
    ...handlers('Draft rejected'),
  });
  const cancel = useMutation({ mutationFn: endpoints.cancelJob, ...handlers('Job cancelled') });

  return {
    delegate: create.mutateAsync,
    approve: approve.mutate,
    revise: revise.mutate,
    reject: reject.mutate,
    cancel: cancel.mutate,
    delegating: create.isPending,
  };
}
