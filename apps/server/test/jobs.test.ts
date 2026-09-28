import type { Email, Job, PullRequest, StreamEvent, Task } from '@argus/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, type TestContext } from './helpers';

let t: TestContext;
beforeAll(async () => {
  t = await createTestApp();
});
afterAll(() => t.close());

const list = async <T>(resource: string) =>
  (await t.inject({ method: 'GET', url: `/api/${resource}` })).json<T[]>();

const createJob = (payload: Record<string, unknown>) =>
  t.inject({ method: 'POST', url: '/api/jobs', payload });

const claim = async (headers = t.agentAuth, payload: Record<string, unknown> = {}) =>
  (await t.inject({ method: 'POST', url: '/api/jobs/claim', headers, payload })).json<Job[]>();

const report = (id: string, payload: Record<string, unknown>, headers = t.agentAuth) =>
  t.inject({ method: 'PATCH', url: `/api/jobs/${id}`, headers, payload });

const decide = (id: string, decision: string, payload: Record<string, unknown> = {}) =>
  t.inject({ method: 'POST', url: `/api/jobs/${id}/${decision}`, payload });

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

describe('delegated jobs', () => {
  it('drafts an email reply, waits for approval with the edited draft, then marks the mail done', async () => {
    const mail = (await list<Email>('emails')).find((e) => !e.done)!;

    const events = await captureEvents(async () => {
      const res = await createJob({
        kind: 'email.reply',
        recordId: mail.id,
        instruction: 'Confirm Thursday',
      });
      expect(res.statusCode).toBe(201);
    });
    expect(events).toContainEqual(expect.objectContaining({ type: 'job.updated' }));
    const [job] = (await t.inject({ method: 'GET', url: `/api/jobs?recordId=${mail.id}` })).json<Job[]>();
    expect(job).toMatchObject({
      kind: 'email.reply',
      resource: 'emails',
      externalId: mail.externalId,
      title: mail.subject,
      requiresApproval: true,
      status: 'pending',
      createdBy: 'user',
    });

    // A second reply on the same mail while one is in flight is refused.
    expect((await createJob({ kind: 'email.reply', recordId: mail.id })).statusCode).toBe(409);

    // The agent claims it and proposes a draft; it cannot send before approval.
    const claimed = await claim();
    expect(claimed.find((j) => j.id === job!.id)).toMatchObject({
      status: 'claimed',
      agentName: 'test-agent',
    });
    expect((await report(job!.id, { status: 'done' })).statusCode).toBe(409);
    const drafted = await report(job!.id, {
      status: 'awaiting_approval',
      draft: { subject: `Re: ${mail.subject}`, body: 'Thursday works.' },
    });
    expect(drafted.json<Job>()).toMatchObject({
      status: 'awaiting_approval',
      draft: { body: 'Thursday works.' },
    });

    // The user edits and approves; the agent claims it again to execute.
    const approved = await decide(job!.id, 'approve', {
      draft: { subject: `Re: ${mail.subject}`, body: 'Thursday at 10 works.' },
    });
    expect(approved.json<Job>()).toMatchObject({
      status: 'approved',
      draft: { body: 'Thursday at 10 works.' },
    });
    expect((await claim()).find((j) => j.id === job!.id)).toMatchObject({ status: 'executing' });
    const done = await report(job!.id, { status: 'done', result: 'sent' });
    expect(done.json<Job>()).toMatchObject({ status: 'done', result: 'sent' });
    expect(done.json<Job>().finishedAt).not.toBeNull();

    expect((await list<Email>('emails')).find((e) => e.id === mail.id)).toMatchObject({ done: true });
  });

  it('refuses to skip approval on email replies', async () => {
    const mail = (await list<Email>('emails')).find((e) => !e.done)!;
    const res = await createJob({ kind: 'email.reply', recordId: mail.id, requiresApproval: false });
    expect(res.statusCode).toBe(400);
  });

  it('moves a delegated Trello card to Doing when claimed and to Done when finished', async () => {
    const card = (await list<Task>('tasks')).find((x) => x.column === 'todo')!;
    const job = (
      await createJob({ kind: 'task.do', recordId: card.id, requiresApproval: false })
    ).json<Job>();

    await claim();
    expect((await list<Task>('tasks')).find((x) => x.id === card.id)!.column).toBe('doing');

    await report(job.id, { status: 'done', result: 'done in Trello' });
    expect((await list<Task>('tasks')).find((x) => x.id === card.id)!.column).toBe('done');
  });

  it('delegates on any resource with the record kind, which needs an instruction', async () => {
    const pr = (await list<PullRequest>('pulls'))[0]!;
    expect((await createJob({ kind: 'record', resource: 'pulls', recordId: pr.id })).statusCode).toBe(400);
    expect((await createJob({ kind: 'record', recordId: pr.id, instruction: 'Review it' })).statusCode).toBe(
      400,
    );
    expect((await createJob({ kind: 'task.do', resource: 'pulls', recordId: pr.id })).statusCode).toBe(400);

    const res = await createJob({
      kind: 'record',
      resource: 'pulls',
      recordId: pr.id,
      instruction: 'Review it',
    });
    expect(res.json<Job>()).toMatchObject({ resource: 'pulls', title: pr.title, instruction: 'Review it' });
  });

  it('sends a draft back with feedback, lets the user reject or cancel', async () => {
    const job = (
      await createJob({ kind: 'free', instruction: 'Summarise the week\nfor the team' })
    ).json<Job>();
    expect(job).toMatchObject({ resource: null, recordId: null, title: 'Summarise the week' });

    await claim();
    await report(job.id, { status: 'awaiting_approval', draft: { body: 'v1' } });
    const revised = await decide(job.id, 'revise', { feedback: 'Shorter' });
    expect(revised.json<Job>()).toMatchObject({ status: 'pending', feedback: 'Shorter', agentId: null });

    await claim();
    await report(job.id, { status: 'awaiting_approval', draft: { body: 'v2' } });
    expect((await decide(job.id, 'reject', { feedback: 'Not needed' })).json<Job>()).toMatchObject({
      status: 'rejected',
      feedback: 'Not needed',
    });
    expect((await decide(job.id, 'cancel')).statusCode).toBe(409);

    const other = (await createJob({ kind: 'free', instruction: 'Something else' })).json<Job>();
    expect((await decide(other.id, 'cancel')).json<Job>()).toMatchObject({ status: 'cancelled' });
  });

  it('hands jobs only to agents whose scopes cover them, and only the holder can report', async () => {
    const pr = (await list<PullRequest>('pulls'))[1]!;
    const job = (
      await createJob({ kind: 'record', resource: 'pulls', recordId: pr.id, instruction: 'Look at the CI' })
    ).json<Job>();

    const mailer = await t.newAgent('mail-only', ['emails']);
    expect((await claim(mailer)).map((j) => j.id)).not.toContain(job.id);
    expect(
      (await t.inject({ method: 'GET', url: '/api/jobs', headers: mailer })).json<Job[]>().map((j) => j.id),
    ).not.toContain(job.id);

    const github = await t.newAgent('github', ['pulls', 'issues']);
    expect((await claim(github, { kinds: ['record'] })).map((j) => j.id)).toContain(job.id);
    expect((await report(job.id, { status: 'failed', result: 'nope' }, t.agentAuth)).statusCode).toBe(403);
    expect(
      (await report(job.id, { status: 'failed', result: 'CI unreachable' }, github)).json<Job>(),
    ).toMatchObject({
      status: 'failed',
    });
  });

  it('keeps user and agent roles apart', async () => {
    expect(
      (
        await t.inject({
          method: 'POST',
          url: '/api/jobs',
          headers: t.agentAuth,
          payload: { kind: 'free', instruction: 'x' },
        })
      ).statusCode,
    ).toBe(401);
    expect((await t.inject({ method: 'POST', url: '/api/jobs/claim', payload: {} })).statusCode).toBe(401);
  });
});
