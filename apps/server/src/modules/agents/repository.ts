import type { Agent, AgentRun, AgentRunStatus, Resource } from '@command/shared';
import { desc, eq, sql } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { agentRuns, agents } from '../../db/schema';
import { toDto } from '../../lib/serialize';

/** Agent without the token hash: what leaves the repository. */
const agentColumns = {
  id: agents.id,
  name: agents.name,
  scopes: agents.scopes,
  createdAt: agents.createdAt,
  lastSeenAt: agents.lastSeenAt,
};

export function createAgentsRepository(db: Db) {
  return {
    async create(name: string, scopes: Resource[], tokenHash: string): Promise<Agent> {
      const [row] = await db.insert(agents).values({ name, scopes, tokenHash }).returning(agentColumns);
      return toDto<Agent>(row!);
    },

    async rotateToken(name: string, tokenHash: string): Promise<Agent | null> {
      const [row] = await db.update(agents).set({ tokenHash }).where(eq(agents.name, name)).returning(agentColumns);
      return row ? toDto<Agent>(row) : null;
    },

    async findByTokenHash(tokenHash: string): Promise<Agent | null> {
      const [row] = await db.select(agentColumns).from(agents).where(eq(agents.tokenHash, tokenHash)).limit(1);
      return row ? toDto<Agent>(row) : null;
    },

    async touch(id: string): Promise<void> {
      await db.update(agents).set({ lastSeenAt: new Date() }).where(eq(agents.id, id));
    },

    async list(): Promise<Agent[]> {
      const rows = await db.select(agentColumns).from(agents).orderBy(agents.name);
      return rows.map((r) => toDto<Agent>(r));
    },

    async startRun(agentId: string, resource: Resource | null, summary: string | null): Promise<AgentRun> {
      const [row] = await db
        .insert(agentRuns)
        .values({ agentId, resource, summary, status: 'running', stats: { upserted: 0, deleted: 0 } })
        .returning();
      return toDto<AgentRun>(row!);
    },

    async getRun(id: string): Promise<AgentRun | null> {
      const [row] = await db.select().from(agentRuns).where(eq(agentRuns.id, id)).limit(1);
      return row ? toDto<AgentRun>(row) : null;
    },

    async finishRun(
      id: string,
      status: Exclude<AgentRunStatus, 'running'>,
      summary: string | null | undefined,
      error: string | null,
    ): Promise<AgentRun> {
      const [row] = await db
        .update(agentRuns)
        .set({ status, error, finishedAt: new Date(), ...(summary !== undefined && { summary }) })
        .where(eq(agentRuns.id, id))
        .returning();
      return toDto<AgentRun>(row!);
    },

    async addRunStats(id: string, upserted: number, deleted: number): Promise<void> {
      await db
        .update(agentRuns)
        .set({
          stats: sql`jsonb_build_object(
            'upserted', (${agentRuns.stats}->>'upserted')::int + ${upserted}::int,
            'deleted', (${agentRuns.stats}->>'deleted')::int + ${deleted}::int)`,
        })
        .where(eq(agentRuns.id, id));
    },

    async recentRuns(limit = 50): Promise<(AgentRun & { agent: string })[]> {
      const rows = await db
        .select({ run: agentRuns, agent: agents.name })
        .from(agentRuns)
        .innerJoin(agents, eq(agents.id, agentRuns.agentId))
        .orderBy(desc(agentRuns.startedAt))
        .limit(limit);
      return rows.map((r) => ({ ...toDto<AgentRun>(r.run), agent: r.agent }));
    },

    /** The most recent run per resource. */
    async latestRunByResource(): Promise<Map<Resource, AgentRun>> {
      const rows = await db
        .selectDistinctOn([agentRuns.resource])
        .from(agentRuns)
        .orderBy(agentRuns.resource, desc(agentRuns.startedAt));
      return new Map(rows.filter((r) => r.resource).map((r) => [r.resource!, toDto<AgentRun>(r)]));
    },
  };
}

export type AgentsRepository = ReturnType<typeof createAgentsRepository>;
