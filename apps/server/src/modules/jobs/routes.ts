import { JobApprove, JobClaim, JobCreate, JobQuery, JobReject, JobReport, JobRevise } from '@argus/shared';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { parse } from '../../lib/validate';

const IdParams = z.object({ id: z.uuid() });

/** Delegated work: the user creates and reviews jobs, agents claim and carry them out. */
export const jobsRoutes: FastifyPluginAsync = async (app) => {
  const { jobs } = app.container;
  const idOf = (params: unknown) => parse(IdParams, params, 'Path').id;

  app.get('/jobs', { preHandler: app.auth.any }, async (req) =>
    jobs.list(parse(JobQuery, req.query, 'Query'), req.agent),
  );
  app.get('/jobs/:id', { preHandler: app.auth.any }, async (req) => jobs.get(idOf(req.params)));

  app.post('/jobs', { preHandler: app.auth.user }, async (req, reply) =>
    reply.status(201).send(await jobs.create(parse(JobCreate, req.body))),
  );
  app.post('/jobs/:id/approve', { preHandler: app.auth.user }, async (req) =>
    jobs.approve(idOf(req.params), parse(JobApprove, req.body ?? {})),
  );
  app.post('/jobs/:id/revise', { preHandler: app.auth.user }, async (req) =>
    jobs.revise(idOf(req.params), parse(JobRevise, req.body)),
  );
  app.post('/jobs/:id/reject', { preHandler: app.auth.user }, async (req) =>
    jobs.reject(idOf(req.params), parse(JobReject, req.body ?? {})),
  );
  app.post('/jobs/:id/cancel', { preHandler: app.auth.user }, async (req) => jobs.cancel(idOf(req.params)));

  app.post('/jobs/claim', { preHandler: app.auth.agent }, async (req) =>
    jobs.claim(req.agent!, parse(JobClaim, req.body ?? {})),
  );
  app.patch('/jobs/:id', { preHandler: app.auth.agent }, async (req) =>
    jobs.report(req.agent!, idOf(req.params), parse(JobReport, req.body)),
  );
};
