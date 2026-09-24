import type { AgentRunStatus } from './schemas/agent';
import type { Resource } from './schemas/common';
import type { DashboardInsights } from './domain/dashboard';
import type { DashboardData } from './domain/types';

/** Response shapes of the HTTP API, shared by server and web. */

export interface UserProfile {
  name: string;
  initials: string;
  role: string;
  githubLogin: string;
}

/** Freshness of one resource: who feeds it and when it was last synced. */
export interface SourceStatus {
  resource: Resource;
  agents: string[];
  lastSyncAt: string | null;
  lastRun: { status: AgentRunStatus; at: string; summary: string | null; error: string | null } | null;
  count: number;
}

export interface DashboardResponse extends DashboardInsights {
  generatedAt: string;
  user: UserProfile;
  data: DashboardData;
  sources: SourceStatus[];
}

export interface ApiError {
  error: string;
  message: string;
  issues?: { path: string; message: string }[];
}

/** Events pushed on GET /api/stream. `event:` is the type, `data:` the JSON payload. */
export type StreamEvent =
  | { type: 'ready'; data: { at: string } }
  | {
      type: 'data.changed';
      data: { resource: Resource; ids: string[]; origin: 'agent' | 'user'; deleted?: string[] };
    }
  | { type: 'agent.run'; data: { runId: string; agent: string; resource: Resource | null; status: AgentRunStatus } }
  | { type: 'action.updated'; data: { id: string; resource: Resource; status: string } }
  /** Saved from another tab or device: refetch GET /api/preferences. */
  | { type: 'preferences.changed'; data: { at: string } };

export type StreamEventType = StreamEvent['type'];
