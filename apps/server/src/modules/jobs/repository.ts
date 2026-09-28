import { FINISHED_JOB_STATUSES, type Job, type JobKind, type JobStatus, type Resource } from '@argus/shared';
import { and, asc, desc, eq, inArray, isNull, lt, notInArray, or, sql, type SQL } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { agents, jobs } from '../../db/schema';
import { toDto } from '../../lib/serialize';

export type NewJob = typeof jobs.$inferInsert;
export type JobChanges = Partial<Omit<NewJob, 'id' | 'createdAt'>>;

/** A claim older than this is considered abandoned and can be claimed again. */
const CLAIM_TIMEOUT_MINUTES = 10;

const selection = { job: jobs, agentName: agents.name };
const toJob = ({ job, agentName }: { job: Record<string, unknown>; agentName: string | null }) =>
  toDto<Job>({ ...job, agentName });

export function createJobsRepository(db: Db) {
  const select = (where: SQL | undefined) =>
    db.select(selection).from(jobs).leftJoin(agents, eq(agents.id, jobs.agentId)).where(where);

  async function get(id: string): Promise<Job | null> {
    const [row] = await select(eq(jobs.id, id)).limit(1);
    return row ? toJob(row) : null;
  }

  return {
    get,

    async insert(job: NewJob): Promise<Job> {
      const [row] = await db.insert(jobs).values(job).returning({ id: jobs.id });
      return (await get(row!.id))!;
    },

    async list(filter: {
      status?: JobStatus;
      active?: boolean;
      recordId?: string;
      /** Restrict to jobs on these resources, plus those without a target (an agent's scopes). */
      resources?: Resource[];
      limit?: number;
    }): Promise<Job[]> {
      const rows = await select(
        and(
          filter.status ? eq(jobs.status, filter.status) : undefined,
          filter.active === true ? notInArray(jobs.status, FINISHED_JOB_STATUSES) : undefined,
          filter.active === false ? inArray(jobs.status, FINISHED_JOB_STATUSES) : undefined,
          filter.recordId ? eq(jobs.recordId, filter.recordId) : undefined,
          filter.resources ? or(isNull(jobs.resource), inArray(jobs.resource, filter.resources)) : undefined,
        ),
      )
        .orderBy(desc(jobs.createdAt))
        .limit(filter.limit ?? 200);
      return rows.map(toJob);
    },

    /** The unfinished job of this kind on a record, if any: there is at most one. */
    async activeOn(kind: JobKind, recordId: string): Promise<Job | null> {
      const [row] = await select(
        and(eq(jobs.kind, kind), eq(jobs.recordId, recordId), notInArray(jobs.status, FINISHED_JOB_STATUSES)),
      ).limit(1);
      return row ? toJob(row) : null;
    },

    /**
     * Atomically hands the oldest jobs waiting for an agent to it: new ones (→ claimed)
     * and approved ones (→ executing), plus claims abandoned for too long. SKIP LOCKED
     * lets several workers claim concurrently without overlap.
     */
    async claim(
      agentId: string,
      filter: { kinds?: JobKind[]; resources: Resource[] },
      limit: number,
    ): Promise<Job[]> {
      const stale = sql`now() - make_interval(mins => ${CLAIM_TIMEOUT_MINUTES})`;
      const candidates = db
        .select({ id: jobs.id })
        .from(jobs)
        .where(
          and(
            filter.kinds ? inArray(jobs.kind, filter.kinds) : undefined,
            or(
              isNull(jobs.resource),
              filter.resources.length ? inArray(jobs.resource, filter.resources) : undefined,
            ),
            or(
              inArray(jobs.status, ['pending', 'approved']),
              and(inArray(jobs.status, ['claimed', 'executing']), lt(jobs.updatedAt, stale)),
            ),
          ),
        )
        .orderBy(asc(jobs.createdAt))
        .limit(limit)
        .for('update', { skipLocked: true });
      const claimed = await db
        .update(jobs)
        .set({
          status: sql`case ${jobs.status} when 'pending' then 'claimed' when 'approved' then 'executing' else ${jobs.status} end`,
          agentId,
          updatedAt: new Date(),
        })
        .where(inArray(jobs.id, candidates))
        .returning({ id: jobs.id });
      if (!claimed.length) return [];
      const rows = await select(
        inArray(
          jobs.id,
          claimed.map((r) => r.id),
        ),
      ).orderBy(asc(jobs.createdAt));
      return rows.map(toJob);
    },

    /**
     * Applies `changes` only if the job is still in one of the `from` statuses, so two
     * concurrent transitions cannot both win. Null when the job moved on meanwhile.
     */
    async transition(id: string, from: readonly JobStatus[], changes: JobChanges): Promise<Job | null> {
      const [row] = await db
        .update(jobs)
        .set({ ...changes, updatedAt: new Date() })
        .where(and(eq(jobs.id, id), inArray(jobs.status, from)))
        .returning({ id: jobs.id });
      return row ? get(row.id) : null;
    },
  };
}

export type JobsRepository = ReturnType<typeof createJobsRepository>;
