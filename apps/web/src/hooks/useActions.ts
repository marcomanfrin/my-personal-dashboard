import {
  normalizeEmailPatch,
  type DashboardResponse,
  type MailCategory,
  type ReminderCreate,
  type TaskColumn,
} from '@command/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { endpoints, type PatchableResource, type PatchMap, type RecordOf } from '../api/endpoints';
import { queryKeys } from '../api/queryClient';
import { useToast } from '../components/feedback/Toast';
import { COLUMNS, MAIL_CAT_LABEL } from '../lib/labels';

interface PatchVars<R extends PatchableResource = PatchableResource> {
  resource: R;
  id: string;
  patch: PatchMap[R];
}

/** The dashboard response with one record merged with `patch`. */
function applyPatch(resp: DashboardResponse, { resource, id, patch }: PatchVars): DashboardResponse {
  const list = resp.data[resource] as { id: string }[];
  return {
    ...resp,
    data: { ...resp.data, [resource]: list.map((r) => (r.id === id ? { ...r, ...patch } : r)) },
  };
}

/** Picks the current values of `keys`, to undo a change. */
const pick = <T extends object, K extends keyof T>(o: T, keys: K[]) =>
  Object.fromEntries(keys.map((k) => [k, o[k]])) as Pick<T, K>;

/**
 * Every user action of the dashboard. Changes apply to the cache at once
 * (optimistic), roll back if the server refuses, and are confirmed by a refetch.
 * The server queues each change for the agent that owns the source.
 */
export function useActions() {
  const qc = useQueryClient();
  const toast = useToast();

  const patchMutation = useMutation({
    mutationFn: ({ resource, id, patch }: PatchVars) => endpoints.patch(resource, id, patch as never),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: queryKeys.dashboard });
      const prev = qc.getQueryData<DashboardResponse>(queryKeys.dashboard);
      if (prev) qc.setQueryData(queryKeys.dashboard, applyPatch(prev, vars));
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.dashboard, ctx.prev);
      toast.error(`Couldn't save: ${(err as Error).message}`);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.dashboard }),
  });

  const createReminder = useMutation({
    mutationFn: endpoints.createReminder,
    onSuccess: () => toast.show('Reminder added'),
    onError: (err) => toast.error(`Couldn't add the reminder: ${(err as Error).message}`),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.dashboard }),
  });

  const recalc = useMutation({
    mutationFn: endpoints.recalcGantt,
    onError: (err) => toast.error(`Couldn't reschedule: ${(err as Error).message}`),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.dashboard }),
  });

  // `mutate` functions are stable; the mutation objects are not.
  const { mutate: mutatePatch } = patchMutation;
  const { mutate: mutateCreate } = createReminder;
  const { mutate: mutateRecalc, isPending: recalculating } = recalc;

  return useMemo(() => {
    const patch = <R extends PatchableResource>(resource: R, id: string, p: PatchMap[R]) =>
      mutatePatch({ resource, id, patch: p } as PatchVars);
    const find = <R extends PatchableResource>(resource: R, id: string) =>
      (qc.getQueryData<DashboardResponse>(queryKeys.dashboard)?.data[resource] as RecordOf<R>[] | undefined)?.find(
        (r) => r.id === id,
      );

    return {
      markEmailDone(id: string) {
        const e = find('emails', id);
        if (!e) return;
        const before = pick(e, ['done', 'read', 'category']);
        patch('emails', id, normalizeEmailPatch({ done: true }));
        toast.show('Marked as done', () => patch('emails', id, before));
      },
      moveEmail(id: string, category: MailCategory) {
        patch('emails', id, normalizeEmailPatch({ category }));
        toast.show(`Moved to ${MAIL_CAT_LABEL[category]}`);
      },
      markEmailRead(id: string) {
        const e = find('emails', id);
        if (e && !e.read) patch('emails', id, { read: true });
      },
      toggleReminder(id: string) {
        const r = find('reminders', id);
        if (!r) return;
        patch('reminders', id, { done: !r.done });
        if (!r.done) toast.show('Reminder completed', () => patch('reminders', id, { done: false }));
      },
      addReminder(input: ReminderCreate) {
        mutateCreate(input);
      },
      markReviewed(id: string) {
        patch('pulls', id, { reviewRequested: false });
        toast.show('Review marked as done', () => patch('pulls', id, { reviewRequested: true }));
      },
      ackIssue(id: string) {
        patch('issues', id, { acknowledged: true });
        toast.show('Acknowledged', () => patch('issues', id, { acknowledged: false }));
      },
      moveTask(id: string, column: TaskColumn) {
        patch('tasks', id, { column });
        toast.show(`Moved to ${COLUMNS.find((c) => c.id === column)!.label}`);
      },
      recalcGantt() {
        mutateRecalc(undefined, {
          onSuccess: ({ moved }) => {
            if (!moved.length) return toast.show('Schedule already respects all dependencies');
            toast.show(`Rescheduled ${moved.map((m) => m.key).join(', ')}`, () =>
              moved.forEach((m) => patch('gantt', m.id, m.previous)),
            );
          },
        });
      },
      recalculating,
    };
  }, [mutatePatch, mutateCreate, mutateRecalc, recalculating, qc, toast]);
}

export type Actions = ReturnType<typeof useActions>;
