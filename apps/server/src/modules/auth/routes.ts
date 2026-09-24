import { LoginBody, type TokenResponse } from '@argus/shared';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { parse } from '../../lib/validate';
import type { Session } from './service';

export const REFRESH_COOKIE = 'argus_refresh';
/** The refresh cookie is sent only to the auth routes, never to the rest of the API. */
const COOKIE_PATH = '/api/auth';

export const authRoutes: FastifyPluginAsync = async (app) => {
  const { auth, config } = app.container;
  const cookieOptions = {
    path: COOKIE_PATH,
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: config.auth.cookieSecure,
  };

  const userAgent = (req: FastifyRequest) => req.headers['user-agent']?.slice(0, 256) ?? null;

  /** Refresh token to the cookie, the rest to the body. */
  const sendSession = (reply: FastifyReply, s: Session) => {
    reply.setCookie(REFRESH_COOKIE, s.refreshToken, { ...cookieOptions, expires: s.refreshExpiresAt });
    const body: TokenResponse = {
      accessToken: s.accessToken,
      tokenType: s.tokenType,
      expiresIn: s.expiresIn,
      user: s.user,
    };
    return reply.header('cache-control', 'no-store').send(body);
  };

  app.post(
    '/auth/login',
    { config: { rateLimit: { max: config.auth.loginRateLimit, timeWindow: '1 minute' } } },
    async (req, reply) => sendSession(reply, await auth.login(parse(LoginBody, req.body, 'Body'), userAgent(req))),
  );

  app.post(
    '/auth/refresh',
    { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } },
    async (req, reply) => {
      try {
        return sendSession(reply, await auth.refresh(req.cookies[REFRESH_COOKIE], userAgent(req)));
      } catch (err) {
        reply.clearCookie(REFRESH_COOKIE, cookieOptions);
        throw err;
      }
    },
  );

  app.post('/auth/logout', async (req, reply) => {
    await auth.logout(req.cookies[REFRESH_COOKIE]);
    reply.clearCookie(REFRESH_COOKIE, cookieOptions);
    return reply.status(204).send();
  });

  app.get('/auth/me', { preHandler: app.auth.user }, async (req) => auth.me(req.user!.sub));
};
