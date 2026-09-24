import { createHash } from 'node:crypto';
import type { Action, DashboardResponse, Email, IngestResult, Reminder, StreamEvent, Task } from '@argus/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { agents } from '../src/db/schema';
import { createTestApp, type TestContext } from './helpers';

let t: TestContext;
beforeAll(async () => {
  t = await createTestApp();
});
afterAll(() => t.close());

const newEmail = (externalId: string, over: Record<string, unknown> = {}) => ({
  externalId,
  from: { name: 'Agent Test', org: 'QA', address: 'qa@example.com' },
  subject: `Subject ${externalId}`,
  receivedAt: new Date().toISOString(),
  category: 'needs-reply',
  priority: 'high',
  ...over,
});

const emailByExternal = async (externalId: string) => {
  const res = await t.inject({ method: 'GET', url: '/api/emails' });
  return res.json<Email[]>().find((e) => e.externalId === externalId)!;
};

/** Collects bus events published while `fn` runs. */
async function captureEvents(fn: () => Promise<unknown>): Promise<StreamEvent[]> {
  const seen: StreamEvent[] = [];
  const off = t.app.container.bus.subscribe((e) => seen.push(e));
  try {
    await fn();
  } finally {
    off();
  }
  return seen;
}

describe('health and read API', () => {
  it('reports healthy', async () => {
    const res = await t.inject({ method: 'GET', url: '/health' });
    expect(res.json()).toEqual({ ok: true });
  });

  it('serves the dashboard with the demo priorities', async () => {
    const res = await t.inject({ method: 'GET', url: '/api/dashboard' });
    expect(res.statusCode).toBe(200);
    const d = res.json<DashboardResponse>();

    expect(d.user).toMatchObject({ name: 'Marco', initials: 'M' });
    expect(d.data.emails).toHaveLength(11);
    // Only the owner's Gantt tasks: 12 in the plan, 2 belong to others.
    expect(d.data.gantt).toHaveLength(10);
    expect(d.attention.slice(0, 2).map((i) => i.level)).toEqual(['critical', 'critical']);
    expect(d.attention.map((i) => i.key)).toContain(`mail:${d.data.emails.find((e) => e.externalId === 'm1')!.id}`);
    expect(d.kpis.find((k) => k.id === 'mail')).toMatchObject({ value: 4, level: 'critical' });
    expect(d.kpis.find((k) => k.id === 'prs')).toMatchObject({ value: 3 });
    expect(d.projects.map((p) => p.key).sort()).toEqual(['AIS', 'ATX', 'HMI', 'PEL', 'UNI']);
    expect(d.conflicts.sort()).toEqual(['AIS-5<AIS-4', 'PEL-18<PEL-17']);
    expect(d.sources.find((s) => s.resource === 'emails')).toMatchObject({ count: 11 });
  });

  it('filters lists and validates ids', async () => {
    const urgent = await t.inject({ method: 'GET', url: '/api/emails?category=urgent' });
    expect(urgent.json<Email[]>().map((e) => e.externalId)).toEqual(['m1']);
    const bad = await t.inject({ method: 'GET', url: '/api/emails/not-a-uuid' });
    expect(bad.statusCode).toBe(400);
    const missing = await t.inject({ method: 'GET', url: '/api/emails/00000000-0000-4000-8000-000000000000' });
    expect(missing.statusCode).toBe(404);
  });
});

describe('agent ingest', () => {
  it('rejects missing or wrong tokens', async () => {
    const none = await t.app.inject({ method: 'PUT', url: '/api/ingest/emails', payload: { items: [] } });
    expect(none.statusCode).toBe(401);
    const wrong = await t.app.inject({
      method: 'PUT',
      url: '/api/ingest/emails',
      headers: { authorization: 'Bearer argus_agent_nope' },
      payload: { items: [] },
    });
    expect(wrong.statusCode).toBe(401);
  });

  it('still accepts tokens issued with the pre-rename cmd_agent_ prefix', async () => {
    const legacy = 'cmd_agent_issued-before-the-rename';
    const tokenHash = createHash('sha256').update(legacy).digest('hex');
    await t.db.insert(agents).values({ name: 'legacy', scopes: ['emails'], tokenHash });
    const res = await t.app.inject({
      method: 'PUT',
      url: '/api/ingest/emails',
      headers: { authorization: `Bearer ${legacy}` },
      payload: { items: [] },
    });
    expect(res.statusCode).toBe(200);
  });

  it('enforces scopes', async () => {
    const mailOnly = await t.newAgent('mail-only', ['emails']);
    const res = await t.inject({ method: 'PUT', url: '/api/ingest/tasks', headers: mailOnly, payload: { items: [] } });
    expect(res.statusCode).toBe(403);
  });

  it('upserts by externalId and notifies subscribers', async () => {
    let res!: Awaited<ReturnType<typeof t.app.inject>>;
    const events = await captureEvents(async () => {
      res = await t.inject({
        method: 'PUT',
        url: '/api/ingest/emails',
        headers: t.agentAuth,
        payload: { items: [newEmail('x1'), newEmail('x1', { subject: 'last wins' })] },
      });
    });
    expect(res.statusCode).toBe(200);
    expect(res.json<IngestResult>()).toMatchObject({ upserted: 1, deleted: 0 });
    expect((await emailByExternal('x1')).subject).toBe('last wins');
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'data.changed', data: expect.objectContaining({ resource: 'emails', origin: 'agent' }) }),
    );
  });

  it('reports every invalid field with its path', async () => {
    const res = await t.inject({
      method: 'PUT',
      url: '/api/ingest/emails',
      headers: t.agentAuth,
      payload: { items: [newEmail('ok'), { externalId: 'bad', category: 'nope' }] },
    });
    expect(res.statusCode).toBe(400);
    const paths = res.json<{ issues: { path: string }[] }>().issues.map((i) => i.path);
    expect(paths).toEqual(expect.arrayContaining(['items.1.subject', 'items.1.category']));
  });

  it('replace mode deletes only the agent own records', async () => {
    const auth = await t.newAgent('calendar-sync', ['events']);
    const ev = (id: string) => ({
      externalId: id,
      title: id,
      start: new Date().toISOString(),
      end: new Date().toISOString(),
      category: 'meeting',
    });
    await t.inject({ method: 'PUT', url: '/api/ingest/events', headers: auth, payload: { items: [ev('c1'), ev('c2')] } });
    const res = await t.inject({
      method: 'PUT',
      url: '/api/ingest/events',
      headers: auth,
      payload: { mode: 'replace', items: [ev('c2')] },
    });
    expect(res.json<IngestResult>()).toMatchObject({ upserted: 1, deleted: 1 });
    const all = (await t.inject({ method: 'GET', url: '/api/events' })).json<{ externalId: string }[]>();
    const ids = all.map((e) => e.externalId);
    expect(ids).toContain('c2');
    expect(ids).not.toContain('c1');
    expect(ids).toContain('e1'); // seeded, owned by no agent
  });
});

describe('user actions and the outbox', () => {
  it('queues a user change, protects it from stale syncs, and lets the agent complete it', async () => {
    const m4 = await emailByExternal('m4');

    // 1. The user marks the mail done: archived + read, one pending action.
    const patched = await t.inject({ method: 'PATCH', url: `/api/emails/${m4.id}`, payload: { done: true } });
    expect(patched.json<Email>()).toMatchObject({ done: true, read: true, category: 'archived' });
    const pending = (
      await t.inject({ method: 'GET', url: '/api/actions?resource=emails&status=pending', headers: t.agentAuth })
    ).json<Action[]>();
    const action = pending.find((a) => a.recordId === m4.id)!;
    expect(action).toMatchObject({
      type: 'update',
      externalId: 'm4',
      changes: { done: true, read: true, category: 'archived' },
      previous: { done: false, read: false, category: 'needs-reply' },
    });

    // 2. A sync that has not seen the change yet does not undo it.
    const stale = { ...m4, done: false, category: 'needs-reply', read: false };
    const ingest = await t.inject({
      method: 'PUT',
      url: '/api/ingest/emails',
      headers: t.agentAuth,
      payload: { items: [stripMeta(stale)] },
    });
    expect(ingest.json<IngestResult>().protectedFields.m4).toEqual(expect.arrayContaining(['done', 'category']));
    expect(await emailByExternal('m4')).toMatchObject({ done: true, category: 'archived' });

    // 3. The agent claims and completes the action.
    const claimed = await t.inject({
      method: 'POST',
      url: '/api/actions/claim',
      headers: t.agentAuth,
      payload: { resource: 'emails' },
    });
    expect(claimed.json<Action[]>().map((a) => a.id)).toContain(action.id);
    const again = await t.inject({ method: 'POST', url: '/api/actions/claim', headers: t.agentAuth, payload: { resource: 'emails' } });
    expect(again.json<Action[]>()).toHaveLength(0);
    const done = await t.inject({
      method: 'PATCH',
      url: `/api/actions/${action.id}`,
      headers: t.agentAuth,
      payload: { status: 'done', result: 'archived in Gmail' },
    });
    expect(done.json<Action>()).toMatchObject({ status: 'done', result: 'archived in Gmail' });

    // 4. Once applied, the source is the truth again.
    await t.inject({ method: 'PUT', url: '/api/ingest/emails', headers: t.agentAuth, payload: { items: [stripMeta(stale)] } });
    expect(await emailByExternal('m4')).toMatchObject({ done: false, category: 'needs-reply' });
  });

  it('queues Trello card moves, undo included, in the order the agent must apply them', async () => {
    const card = (await t.inject({ method: 'GET', url: '/api/tasks' })).json<Task[]>().find((x) => x.column !== 'done')!;
    const from = card.column;

    // Drag to Done, then Undo from the toast.
    await t.inject({ method: 'PATCH', url: `/api/tasks/${card.id}`, payload: { column: 'done' } });
    await t.inject({ method: 'PATCH', url: `/api/tasks/${card.id}`, payload: { column: from } });

    const claimed = (
      await t.inject({ method: 'POST', url: '/api/actions/claim', headers: t.agentAuth, payload: { resource: 'tasks' } })
    ).json<Action[]>();
    expect(claimed.filter((a) => a.recordId === card.id)).toMatchObject([
      { externalId: card.externalId, changes: { column: 'done' }, previous: { column: from } },
      { externalId: card.externalId, changes: { column: from }, previous: { column: 'done' } },
    ]);
  });

  it('keeps cards in position order and protects a pending reorder from stale syncs', async () => {
    const list = async () => (await t.inject({ method: 'GET', url: '/api/tasks?column=todo' })).json<Task[]>();
    const before = await list();
    expect(before.map((x) => x.position)).toEqual([...before.map((x) => x.position)].sort((a, b) => a! - b!));
    const [first, second] = before;

    // Drop the first card between the second and the third.
    const between = (second!.position! + (before[2]?.position ?? second!.position! * 2)) / 2;
    await t.inject({ method: 'PATCH', url: `/api/tasks/${first!.id}`, payload: { position: between } });
    expect((await list()).map((x) => x.id).slice(0, 2)).toEqual([second!.id, first!.id]);

    // An agent sync that has not applied the move yet keeps the user's order.
    const ingest = await t.inject({
      method: 'PUT',
      url: '/api/ingest/tasks',
      headers: t.agentAuth,
      payload: { items: [stripMeta(first!)] },
    });
    expect(ingest.json<IngestResult>().protectedFields[first!.externalId]).toContain('position');
    expect((await list()).find((x) => x.id === first!.id)!.position).toBe(between);
  });

  it('ignores no-op patches and rejects empty ones', async () => {
    const m1 = await emailByExternal('m1');
    const before = (await t.inject({ method: 'GET', url: '/api/actions' })).json<Action[]>().length;
    await t.inject({ method: 'PATCH', url: `/api/emails/${m1.id}`, payload: { read: m1.read } });
    const after = (await t.inject({ method: 'GET', url: '/api/actions' })).json<Action[]>().length;
    expect(after).toBe(before);
    const empty = await t.inject({ method: 'PATCH', url: `/api/emails/${m1.id}`, payload: {} });
    expect(empty.statusCode).toBe(400);
  });

  it('creates and deletes local reminders', async () => {
    const created = await t.inject({
      method: 'POST',
      url: '/api/reminders',
      payload: { title: 'Call the plant', due: new Date().toISOString() },
    });
    expect(created.statusCode).toBe(201);
    const r = created.json<Reminder>();
    expect(r).toMatchObject({ title: 'Call the plant', category: 'Inbox', done: false, agentId: null });
    expect(r.externalId).toMatch(/^local:/);

    const del = await t.inject({ method: 'DELETE', url: `/api/reminders/${r.id}` });
    expect(del.statusCode).toBe(204);
    const actions = (await t.inject({ method: 'GET', url: '/api/actions?resource=reminders' })).json<Action[]>();
    expect(actions.filter((a) => a.recordId === r.id).map((a) => a.type).sort()).toEqual(['create', 'delete']);
  });

  it('reschedules the Gantt by dependencies', async () => {
    const res = await t.inject({ method: 'POST', url: '/api/gantt/recalc' });
    const moved = res.json<{ moved: { key: string }[] }>().moved.map((m) => m.key).sort();
    expect(moved).toEqual(['AIS-5', 'PEL-18']);
    const d = (await t.inject({ method: 'GET', url: '/api/dashboard' })).json<DashboardResponse>();
    expect(d.conflicts).toEqual([]);
  });
});

describe('agent runs', () => {
  it('tracks a run with its ingest stats and exposes it in sources', async () => {
    const started = await t.inject({
      method: 'POST',
      url: '/api/agents/runs',
      headers: t.agentAuth,
      payload: { resource: 'pulls', summary: 'Scanning GitHub' },
    });
    expect(started.statusCode).toBe(201);
    const runId = started.json<{ id: string }>().id;

    const pr = {
      externalId: 'gh-999',
      repo: 'sistec/demo',
      number: 999,
      title: 'Agent PR',
      author: 'bot',
      status: 'open',
      checks: { total: 1, passed: 1, failed: 0, pending: 0 },
      createdAt: new Date().toISOString(),
    };
    await t.inject({ method: 'PUT', url: '/api/ingest/pulls', headers: t.agentAuth, payload: { runId, items: [pr] } });
    const finished = await t.inject({
      method: 'PATCH',
      url: `/api/agents/runs/${runId}`,
      headers: t.agentAuth,
      payload: { status: 'success', summary: '1 PR updated' },
    });
    expect(finished.json()).toMatchObject({ status: 'success', stats: { upserted: 1, deleted: 0 } });

    const twice = await t.inject({
      method: 'PATCH',
      url: `/api/agents/runs/${runId}`,
      headers: t.agentAuth,
      payload: { status: 'success' },
    });
    expect(twice.statusCode).toBe(409);

    const sources = (await t.inject({ method: 'GET', url: '/api/sources' })).json<DashboardResponse['sources']>();
    expect(sources.find((s) => s.resource === 'pulls')).toMatchObject({
      agents: expect.arrayContaining(['test-agent']),
      lastRun: { status: 'success', summary: '1 PR updated' },
    });
  });
});

/** Turns a stored record back into agent input. */
function stripMeta<T extends Record<string, unknown>>(row: T) {
  const { id: _id, agentId: _a, syncedAt: _s, updatedAt: _u, ...rest } = row;
  return rest;
}
