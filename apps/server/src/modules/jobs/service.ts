import {
  JOB_KINDS,
  type JobCreate,
  jobResource,
  type Agent,
  type Job,
  type JobApprove,
  type JobClaim,
  type JobOrigin,
  type JobQuery,
  type JobReject,
  type JobReport,
  type JobRevise,
  type JobStatus,
} from '@argus/shared';
import type { z } from 'zod';
import type { Db } from '../../db/client';
import { badRequest, conflict, forbidden, HttpError, notFound } from '../../lib/errors';
import type { EventBus } from '../../plugins/events-bus';
import { assertScope } from '../agents/service';
import { RESOURCE_REPOSITORIES } from '../registry';
import type { Resources } from '../resources';
import { createJobsRepository, type JobChanges } from './repository';

const TITLE_MAX = 120;

/** The line a record is known by: its title, subject or name. */
function labelOf(record: Record<string, unknown>): string {
  const label = record.title ?? record.subject ?? record.name;
  return typeof label === 'string' && label ? label : String(record.externalId);
}

const clip = (s: string) => {
  const line = s.split('\n')[0]!.trim();
  return line.length > TITLE_MAX ? `${line.slice(0, TITLE_MAX - 1)}…` : line;
};

/**
 * Jobs: work the user delegates to agents. The user creates and reviews them, agents
 * claim, draft and carry them out. Every change is announced on the bus as `job.updated`.
 */
export function createJobsService({ db, bus, resources }: { db: Db; bus: EventBus; resources: Resources }) {
  const repo = createJobsRepository(db);
  const notify = (j: Job) =>
    bus.publish({ type: 'job.updated', data: { id: j.id, kind: j.kind, status: j.status } });

  async function load(id: string): Promise<Job> {
    const job = await repo.get(id);
    if (!job) throw notFound('job');
    return job;
  }

  /** Moves a job on, or explains why it cannot move from where it is. */
  async function transition(id: string, from: readonly JobStatus[], changes: JobChanges): Promise<Job> {
    const job = await repo.transition(id, from, changes);
    if (!job) {
      const current = await load(id);
      throw conflict(`Job is ${current.status}, expected ${from.join(' or ')}`);
    }
    notify(job);
    return job;
  }

  /** The dashboard follows the job: best effort, the record may be gone by now. */
  async function reflect(job: Job, event: 'claimed' | 'done'): Promise<void> {
    if (!job.recordId) return;
    try {
      if (job.kind === 'task.do') {
        const card = await resources.tasks.get(job.recordId);
        if (event === 'claimed' && card.column === 'todo')
          await resources.tasks.update(card.id, { column: 'doing' });
        if (event === 'done' && card.column !== 'done')
          await resources.tasks.update(card.id, { column: 'done' });
      }
      if (job.kind === 'email.reply' && event === 'done')
        await resources.emails.update(job.recordId, { done: true });
    } catch (err) {
      if (!(err instanceof HttpError && err.statusCode === 404)) throw err;
    }
  }

  function assertHolder(agent: Agent, job: Job): void {
    if (job.resource) assertScope(agent, job.resource);
    if (job.agentId !== agent.id) throw forbidden('Job is held by another agent');
  }

  return {
    get: load,

    /** Agents see only jobs their scopes cover; the user sees everything. */
    list(query: JobQuery, agent: Agent | null): Promise<Job[]> {
      return repo.list({ ...query, resources: agent?.scopes });
    },

    async create(body: z.output<typeof JobCreate>, createdBy: JobOrigin = 'user'): Promise<Job> {
      const spec = JOB_KINDS[body.kind];
      if (spec.approval === 'always' && body.requiresApproval === false)
        throw badRequest(`${body.kind} always needs your approval`);
      const resource = jobResource(body.kind, body.resource);
      const { instruction } = body;

      let target: { recordId: string; externalId: string; title: string } | null = null;
      if (resource && body.recordId) {
        const record = (await RESOURCE_REPOSITORIES[resource](db).get(body.recordId)) as Record<
          string,
          unknown
        > | null;
        if (!record) throw notFound(resource.replace(/s$/, ''));
        const active = await repo.activeOn(body.kind, body.recordId);
        if (active) throw conflict(`An agent is already on it (job ${active.status})`);
        target = {
          recordId: body.recordId,
          externalId: String(record.externalId),
          title: clip(labelOf(record)),
        };
      }

      const job = await repo.insert({
        kind: body.kind,
        resource,
        recordId: target?.recordId ?? null,
        externalId: target?.externalId ?? null,
        title: target?.title ?? clip(instruction),
        instruction,
        requiresApproval: body.requiresApproval ?? true,
        createdBy,
      });
      notify(job);
      return job;
    },

    async claim(agent: Agent, { kinds, limit = 5 }: JobClaim): Promise<Job[]> {
      const claimed = await repo.claim(agent.id, { kinds, resources: agent.scopes }, limit);
      for (const job of claimed) {
        notify(job);
        if (job.status === 'claimed') await reflect(job, 'claimed');
      }
      return claimed;
    },

    /** The agent holding the job: a draft to review, or the outcome. */
    async report(agent: Agent, id: string, body: JobReport): Promise<Job> {
      const job = await load(id);
      assertHolder(agent, job);
      switch (body.status) {
        case 'awaiting_approval':
          return transition(id, ['claimed'], {
            status: 'awaiting_approval',
            draft: body.draft,
            feedback: null,
          });
        case 'done': {
          // Without approval the agent may act as soon as it claims; otherwise only once approved.
          const from: JobStatus[] = job.requiresApproval ? ['executing'] : ['claimed', 'executing'];
          if (!from.includes(job.status))
            throw conflict(
              `Job is ${job.status}: ${job.requiresApproval ? 'it needs approval first' : 'claim it first'}`,
            );
          const done = await transition(id, from, {
            status: 'done',
            result: body.result ?? null,
            ...(body.draft && { draft: body.draft }),
            finishedAt: new Date(),
          });
          await reflect(done, 'done');
          return done;
        }
        case 'failed':
          return transition(id, ['claimed', 'executing'], {
            status: 'failed',
            result: body.result,
            finishedAt: new Date(),
          });
      }
    },

    approve: (id: string, body: JobApprove) =>
      transition(id, ['awaiting_approval'], { status: 'approved', ...(body.draft && { draft: body.draft }) }),

    /** Back to the queue with the user's feedback; any agent may pick it up again. */
    revise: (id: string, body: JobRevise) =>
      transition(id, ['awaiting_approval'], { status: 'pending', feedback: body.feedback, agentId: null }),

    reject: (id: string, body: JobReject) =>
      transition(id, ['awaiting_approval'], {
        status: 'rejected',
        feedback: body.feedback ?? null,
        finishedAt: new Date(),
      }),

    /** Not once the agent is carrying it out: it may be half done in the real system. */
    cancel: (id: string) =>
      transition(id, ['pending', 'claimed', 'awaiting_approval', 'approved'], {
        status: 'cancelled',
        finishedAt: new Date(),
      }),
  };
}

export type JobsService = ReturnType<typeof createJobsService>;
