import type { PreferencesResponse, StreamEvent } from '@command/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, type TestContext } from './helpers';

let t: TestContext;
beforeAll(async () => {
  t = await createTestApp();
});
afterAll(() => t.close());

const get = async () => (await t.inject({ method: 'GET', url: '/api/preferences' })).json<PreferencesResponse>();
const patch = (payload: Record<string, unknown>) => t.inject({ method: 'PATCH', url: '/api/preferences', payload });

describe('user preferences', () => {
  it('starts empty', async () => {
    expect(await get()).toEqual({ preferences: {}, updatedAt: null });
  });

  it('merges top-level keys and tells the other tabs', async () => {
    const board = { order: ['kpis', 'overview'], spans: { gantt: 8 } };
    const seen: StreamEvent[] = [];
    const off = t.app.container.bus.subscribe((e) => seen.push(e));
    try {
      expect((await patch({ board })).statusCode).toBe(200);
      const res = await patch({ collapsed: { mail: true }, sidebarCollapsed: true });
      expect(res.json<PreferencesResponse>().preferences).toEqual({ board, collapsed: { mail: true }, sidebarCollapsed: true });
    } finally {
      off();
    }
    expect(seen.filter((e) => e.type === 'preferences.changed')).toHaveLength(2);

    // A key sent again replaces the stored value, it is not deep-merged.
    await patch({ collapsed: { gantt: true } });
    const now = await get();
    expect(now.preferences.collapsed).toEqual({ gantt: true });
    expect(now.preferences.board).toEqual(board);
    expect(now.updatedAt).toEqual(expect.any(String));
  });

  it('rejects unknown keys, bad values and empty bodies', async () => {
    expect((await patch({ theme: 'dark' })).statusCode).toBe(400);
    expect((await patch({ board: { order: [], spans: { gantt: 6 } } })).statusCode).toBe(400);
    expect((await patch({})).statusCode).toBe(400);
  });

  it('belongs to the user: agents and anonymous callers get nothing', async () => {
    expect((await t.inject({ method: 'GET', url: '/api/preferences', headers: t.agentAuth })).statusCode).toBe(401);
    expect((await t.app.inject({ method: 'PATCH', url: '/api/preferences', payload: { sidebarCollapsed: false } })).statusCode).toBe(401);
  });

  it('drops settings an older app version saved in another shape', async () => {
    const { db } = t.app.container;
    const { userPreferences } = await import('../src/db/schema');
    await db.update(userPreferences).set({ data: { sidebarCollapsed: 'yes', board: { order: ['mail'], spans: {} } } as never });
    expect((await get()).preferences).toEqual({ board: { order: ['mail'], spans: {} } });
  });
});
