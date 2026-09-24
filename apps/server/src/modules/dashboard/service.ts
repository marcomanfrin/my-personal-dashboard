import {
  buildInsights,
  RESOURCES,
  type DashboardData,
  type DashboardResponse,
  type SourceStatus,
  type UserProfile,
} from '@command/shared';
import type { Config } from '../../config/env';
import type { Db } from '../../db/client';
import type { AgentsService } from '../agents/service';
import { RESOURCE_REPOSITORIES } from '../registry';
import type { Resources } from '../resources';

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

/** Assembles the single payload the dashboard renders from, plus the derived views. */
export function createDashboardService(deps: {
  db: Db;
  config: Config;
  resources: Resources;
  agents: AgentsService;
}) {
  const { db, config, resources: r, agents } = deps;

  const profile = (): UserProfile => ({
    name: config.user.name,
    initials: initialsOf(config.user.name),
    role: config.user.role,
    githubLogin: config.user.githubLogin,
  });

  async function data(): Promise<DashboardData> {
    const [emails, events, pulls, issues, reminders, tasks, projects, gantt] = await Promise.all([
      r.emails.list(),
      r.events.list(),
      r.pulls.list(),
      r.issues.list(),
      r.reminders.list(),
      r.tasks.list(),
      r.projects.list(),
      r.gantt.list({ assignee: config.user.name }),
    ]);
    return { emails, events, pulls, issues, reminders, tasks, projects, gantt };
  }

  /** Per resource: which agents may feed it, when it was last synced, how the last run went. */
  async function sources(): Promise<SourceStatus[]> {
    const [allAgents, lastRuns, stats] = await Promise.all([
      agents.list(),
      agents.latestRunByResource(),
      Promise.all(RESOURCES.map((res) => RESOURCE_REPOSITORIES[res](db).stats())),
    ]);
    return RESOURCES.map((resource, i) => {
      const run = lastRuns.get(resource);
      return {
        resource,
        agents: allAgents.filter((a) => a.scopes.includes(resource)).map((a) => a.name),
        lastSyncAt: stats[i]!.lastSyncAt,
        count: stats[i]!.count,
        lastRun: run
          ? { status: run.status, at: run.finishedAt ?? run.startedAt, summary: run.summary, error: run.error }
          : null,
      };
    });
  }

  return {
    profile,
    sources,

    async get(now = new Date()): Promise<DashboardResponse> {
      const [d, src] = await Promise.all([data(), sources()]);
      return {
        generatedAt: now.toISOString(),
        user: profile(),
        data: d,
        sources: src,
        ...buildInsights(d, now),
      };
    },
  };
}

export type DashboardService = ReturnType<typeof createDashboardService>;
