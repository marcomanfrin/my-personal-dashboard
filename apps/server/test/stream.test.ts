import type { Email } from '@command/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, type TestContext } from './helpers';

let t: TestContext;
let base: string;
beforeAll(async () => {
  t = await createTestApp();
  base = await t.app.listen({ port: 0, host: '127.0.0.1' });
});
afterAll(() => t.close());

/** Reads SSE frames until one matches `event`. */
async function nextEvent(reader: ReadableStreamDefaultReader<Uint8Array>, event: string, buf = { s: '' }) {
  const decoder = new TextDecoder();
  for (;;) {
    const frames = buf.s.split('\n\n');
    buf.s = frames.pop()!;
    for (const f of frames) {
      const type = /^event: (.+)$/m.exec(f)?.[1];
      const data = /^data: (.+)$/m.exec(f)?.[1];
      if (type === event) return JSON.parse(data!);
    }
    const { value, done } = await reader.read();
    if (done) throw new Error('stream ended');
    buf.s += decoder.decode(value, { stream: true });
  }
}

describe('SSE stream', () => {
  it('requires a user access token', async () => {
    expect((await fetch(`${base}/api/stream`)).status).toBe(401);
    expect((await fetch(`${base}/api/stream?access_token=garbage`)).status).toBe(401);
  });

  it('pushes data.changed when the user changes a record', async () => {
    const token = t.userAuth.authorization.slice('Bearer '.length);
    const ctrl = new AbortController();
    // EventSource cannot send headers, so the browser passes the JWT in the query.
    const res = await fetch(`${base}/api/stream?access_token=${token}`, { signal: ctrl.signal });
    expect(res.headers.get('content-type')).toMatch(/text\/event-stream/);
    const reader = res.body!.getReader();
    const buf = { s: '' };
    await nextEvent(reader, 'ready', buf);

    const headers = { ...t.userAuth, 'content-type': 'application/json' };
    const [email] = (await (await fetch(`${base}/api/emails?category=urgent`, { headers })).json()) as Email[];
    await fetch(`${base}/api/emails/${email!.id}`, { method: 'PATCH', headers, body: JSON.stringify({ read: true }) });

    const changed = await nextEvent(reader, 'data.changed', buf);
    expect(changed).toEqual({ resource: 'emails', ids: [email!.id], origin: 'user' });
    ctrl.abort();
  });
});
