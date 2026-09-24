import type { Agent } from '@argus/shared';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { unauthorized } from '../lib/errors';
import { isAgentToken, type AgentsService } from '../modules/agents/service';
import type { AccessClaims } from '../modules/auth/access-tokens';
import type { AuthService } from '../modules/auth/service';

declare module 'fastify' {
  interface FastifyRequest {
    /** The authenticated agent, set by `app.auth.agent` / `app.auth.any`. */
    agent: Agent | null;
    /** The dashboard user's access-token claims, set by `app.auth.user` / `app.auth.any`. */
    user: AccessClaims | null;
  }
  interface FastifyInstance {
    auth: {
      /** Agent bearer token required. */
      agent(request: FastifyRequest): Promise<void>;
      /** A valid user access token (JWT) required. */
      user(request: FastifyRequest): Promise<void>;
      /** Either of the two: read routes useful to agents too. */
      any(request: FastifyRequest): Promise<void>;
      /** Like `user`, also accepting `?access_token=`: EventSource cannot send headers. */
      stream(request: FastifyRequest): Promise<void>;
    };
  }
}

export interface AuthOptions {
  agents: AgentsService;
  auth: AuthService;
}

function bearerOf(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  return header?.startsWith('Bearer ') ? header.slice(7).trim() : null;
}

export const authPlugin = fp(async (app: FastifyInstance, { agents, auth }: AuthOptions) => {
  app.decorateRequest('agent', null);
  app.decorateRequest('user', null);

  const asAgent = async (request: FastifyRequest, token: string | null) => {
    if (!isAgentToken(token)) throw unauthorized('Agent token required');
    const found = await agents.authenticate(token);
    if (!found) throw unauthorized();
    request.agent = found;
  };

  const asUser = (request: FastifyRequest, token: string | null) => {
    if (!token) throw unauthorized('Login required');
    const claims = auth.verifyAccessToken(token);
    if (!claims) throw unauthorized('Invalid or expired access token');
    request.user = claims;
  };

  app.decorate('auth', {
    agent: async (request) => asAgent(request, bearerOf(request)),
    user: async (request) => asUser(request, bearerOf(request)),
    any: async (request) => {
      const token = bearerOf(request);
      return isAgentToken(token) ? asAgent(request, token) : asUser(request, token);
    },
    stream: async (request) => {
      const q = request.query as { access_token?: unknown } | undefined;
      asUser(request, bearerOf(request) ?? (typeof q?.access_token === 'string' ? q.access_token : null));
    },
  });
});
