import { RESOURCE_SCHEMAS, RESOURCES, type DashboardData, type DashboardResponse, type TokenResponse } from '@command/shared';
// The same demo data the server seeds, so the UI is tested on realistic content.
import { demoData } from '../../server/src/db/seed-data';

let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;

/** The demo data as the API returns it: validated (defaults applied) with record metadata. */
export function dashboardFixture(now = new Date()): DashboardResponse {
  const raw = demoData(now);
  const data = Object.fromEntries(
    RESOURCES.map((r) => [
      r,
      raw[r].map((item) => ({
        ...(RESOURCE_SCHEMAS[r].input.parse(item) as object),
        id: uuid(),
        agentId: null,
        syncedAt: now.toISOString(),
        updatedAt: now.toISOString(),
      })),
    ]),
  ) as unknown as DashboardData;
  data.gantt = data.gantt.filter((t) => t.assignee === 'Marco');

  return {
    generatedAt: now.toISOString(),
    user: { name: 'Marco', initials: 'M', role: 'Automation & software', githubLogin: 'marco-v' },
    data,
    sources: RESOURCES.map((resource) => ({ resource, agents: [], lastSyncAt: null, lastRun: null, count: 0 })),
    attention: [],
    upcoming: [],
    kpis: [],
    projects: [],
    conflicts: [],
  };
}

export const tokenResponse = (): TokenResponse => ({
  accessToken: 'header.payload.signature',
  tokenType: 'Bearer',
  expiresIn: 900,
  user: {
    id: '00000000-0000-4000-8000-00000000abcd',
    email: 'marco@example.com',
    name: 'Marco',
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
  },
});
