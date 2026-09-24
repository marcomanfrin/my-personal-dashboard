import { Resource } from '@command/shared';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { parse } from '../../lib/validate';

const Params = z.object({ resource: Resource });

export const ingestRoutes: FastifyPluginAsync = async (app) => {
  const { ingest } = app.container;

  app.put('/ingest/:resource', { preHandler: app.auth.agent, bodyLimit: 10 * 1024 * 1024 }, async (req) => {
    const { resource } = parse(Params, req.params, 'Path');
    return ingest.ingest(req.agent!, resource, req.body);
  });
};
