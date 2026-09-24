import type { ApiError } from '@command/shared';
import type { FastifyError, FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { HttpError } from '../lib/errors';

/** Renders every error as ApiError JSON. */
export const errorHandlerPlugin = fp(async (app: FastifyInstance) => {
  app.setErrorHandler((err: FastifyError | HttpError, request, reply) => {
    if (err instanceof HttpError) {
      const body: ApiError = { error: err.code, message: err.message, ...(err.issues && { issues: err.issues }) };
      return reply.status(err.statusCode).send(body);
    }
    const status = err.statusCode ?? 500;
    if (status >= 500) request.log.error(err);
    const code = status >= 500 ? 'internal_error' : status === 429 ? 'too_many_requests' : err.code;
    const body: ApiError = {
      error: (code ?? 'bad_request').toLowerCase(),
      message: status >= 500 ? 'Internal server error' : err.message,
    };
    return reply.status(status).send(body);
  });

  app.setNotFoundHandler((request, reply) => {
    const body: ApiError = { error: 'not_found', message: `Route ${request.method} ${request.url} not found` };
    return reply.status(404).send(body);
  });
});
