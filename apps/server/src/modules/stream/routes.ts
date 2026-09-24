import type { ServerResponse } from 'node:http';
import type { StreamEvent } from '@argus/shared';
import type { FastifyPluginAsync } from 'fastify';

/** Keeps proxies and browsers from closing an idle stream. */
const HEARTBEAT_MS = 25_000;

const frame = (e: StreamEvent) => `event: ${e.type}\ndata: ${JSON.stringify(e.data)}\n\n`;

/**
 * Server-Sent Events: forwards every bus event to the browser. The client
 * refetches the resource named in `data.changed` rather than patching locally.
 */
export const streamRoutes: FastifyPluginAsync = async (app) => {
  const { bus } = app.container;
  const open = new Set<ServerResponse>();

  // Hijacked responses are invisible to Fastify: end them or close() waits forever.
  app.addHook('preClose', async () => {
    for (const res of open) res.end();
  });

  app.get('/stream', { preHandler: app.auth.stream }, (req, reply) => {
    reply.hijack();
    const res = reply.raw;
    res.writeHead(200, {
      // Headers set by earlier hooks, CORS included; hijack skips Fastify's own send.
      ...(reply.getHeaders() as Record<string, string>),
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write('retry: 3000\n\n');
    res.write(frame({ type: 'ready', data: { at: new Date().toISOString() } }));
    open.add(res);

    const unsubscribe = bus.subscribe((e) => res.write(frame(e)));
    const heartbeat = setInterval(() => res.write(': ping\n\n'), HEARTBEAT_MS);
    res.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
      open.delete(res);
    });
  });
};
