import type { AuthUser, TokenResponse } from '@command/shared';
import { createSigner } from 'fast-jwt';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, refreshCookieOf, TEST_USER, type TestContext } from './helpers';

let t: TestContext;
beforeAll(async () => {
  // Many logins below: the default limit is exercised in its own test.
  t = await createTestApp({ LOGIN_RATE_LIMIT: '1000' });
});
afterAll(() => t.close());

const refresh = (cookie?: string) =>
  t.app.inject({ method: 'POST', url: '/api/auth/refresh', headers: cookie ? { cookie } : {} });
const dashboard = (authorization?: string) =>
  t.app.inject({ method: 'GET', url: '/api/dashboard', headers: authorization ? { authorization } : {} });

describe('login', () => {
  it('rejects wrong password and unknown email with the same answer', async () => {
    const wrong = await t.login(TEST_USER.email, 'nope-nope-nope');
    const unknown = await t.login('ghost@example.com', 'nope-nope-nope');
    expect(wrong.statusCode).toBe(401);
    expect(unknown.statusCode).toBe(401);
    expect(wrong.json().message).toBe(unknown.json().message);
  });

  it('is case-insensitive on email and returns a JWT plus an httpOnly refresh cookie', async () => {
    const res = await t.login(TEST_USER.email.toUpperCase());
    expect(res.statusCode).toBe(200);
    const body = res.json<TokenResponse & Record<string, unknown>>();
    expect(body).toMatchObject({ tokenType: 'Bearer', expiresIn: 900, user: { email: TEST_USER.email } });
    expect(body.accessToken.split('.')).toHaveLength(3);
    expect(body).not.toHaveProperty('refreshToken');
    expect(res.headers['cache-control']).toBe('no-store');

    const cookie = res.cookies.find((c) => c.name === 'cmd_refresh')!;
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Strict', path: '/api/auth' });
  });

  it('validates the body', async () => {
    const res = await t.app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'not-an-email' } });
    expect(res.statusCode).toBe(400);
  });
});

describe('access tokens', () => {
  it('guards user routes', async () => {
    expect((await dashboard()).statusCode).toBe(401);
    expect((await dashboard('Bearer garbage')).statusCode).toBe(401);
    expect((await dashboard(t.userAuth.authorization)).statusCode).toBe(200);
  });

  it('rejects tokens signed with another key or already expired', async () => {
    const claims = { sub: '00000000-0000-4000-8000-000000000000', email: 'x@example.com', name: 'x' };
    const forged = createSigner({ key: 'another-secret-that-is-long-enough!!', iss: 'command', aud: 'command-dashboard' })(claims);
    expect((await dashboard(`Bearer ${forged}`)).statusCode).toBe(401);
    const expired = createSigner({
      key: 'test-secret-that-is-long-enough-for-hs256',
      iss: 'command',
      aud: 'command-dashboard',
      clockTimestamp: Date.now() - 3_600_000,
      expiresIn: 60_000,
    })(claims);
    expect((await dashboard(`Bearer ${expired}`)).statusCode).toBe(401);
  });

  it('keeps users and agents apart', async () => {
    // An agent token is not a user session...
    expect((await dashboard(t.agentAuth.authorization)).statusCode).toBe(401);
    // ...and a user JWT cannot write as an agent.
    const ingest = await t.app.inject({
      method: 'PUT',
      url: '/api/ingest/emails',
      headers: t.userAuth,
      payload: { items: [] },
    });
    expect(ingest.statusCode).toBe(401);
    // Shared read routes accept both.
    for (const h of [t.userAuth, t.agentAuth])
      expect((await t.app.inject({ method: 'GET', url: '/api/emails', headers: h })).statusCode).toBe(200);
  });

  it('returns the current user', async () => {
    const res = await t.inject({ method: 'GET', url: '/api/auth/me' });
    expect(res.json<AuthUser>()).toMatchObject({ email: TEST_USER.email, name: TEST_USER.name });
    expect(res.json()).not.toHaveProperty('passwordHash');
  });
});

describe('refresh and logout', () => {
  it('rotates the refresh token on every use', async () => {
    const first = refreshCookieOf(await t.login());
    const r1 = await refresh(first);
    expect(r1.statusCode).toBe(200);
    const second = refreshCookieOf(r1);
    expect(second).not.toBe(first);
    expect((await dashboard(`Bearer ${r1.json<TokenResponse>().accessToken}`)).statusCode).toBe(200);

    // The old one is dead; within the grace window the new one survives (two tabs racing).
    expect((await refresh(first)).statusCode).toBe(401);
    expect((await refresh(second)).statusCode).toBe(200);
  });

  it('revokes every session when an old refresh token is replayed', async () => {
    const stolen = refreshCookieOf(await t.login());
    const current = refreshCookieOf(await refresh(stolen));
    // Pretend the rotation happened long ago: a replay now is theft, not a race.
    await t.db.execute(sql`update refresh_tokens set revoked_at = now() - interval '1 hour' where revoked_at is not null`);
    expect((await refresh(stolen)).statusCode).toBe(401);
    expect((await refresh(current)).statusCode).toBe(401);
  });

  it('requires a cookie and clears it on failure', async () => {
    expect((await refresh()).statusCode).toBe(401);
    const bad = await refresh('cmd_refresh=not-a-real-token');
    expect(bad.statusCode).toBe(401);
    expect(bad.cookies.find((c) => c.name === 'cmd_refresh')?.value).toBe('');
  });

  it('logout revokes the refresh token', async () => {
    const cookie = refreshCookieOf(await t.login());
    const out = await t.app.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie } });
    expect(out.statusCode).toBe(204);
    expect((await refresh(cookie)).statusCode).toBe(401);
  });

  it('a password change signs out every device', async () => {
    const email = 'second@example.com';
    await t.app.container.users.createUser(email, 'Second', 'first-password-123');
    const cookie = refreshCookieOf(await t.login(email, 'first-password-123'));
    await t.app.container.users.setPassword(email, 'second-password-456');
    expect((await refresh(cookie)).statusCode).toBe(401);
    expect((await t.login(email, 'first-password-123')).statusCode).toBe(401);
    expect((await t.login(email, 'second-password-456')).statusCode).toBe(200);
  });

  it('refuses short passwords', async () => {
    await expect(t.app.container.users.createUser('short@example.com', 'S', 'short')).rejects.toThrow(/at least/);
  });
});

describe('rate limiting', () => {
  it('throttles login attempts', async () => {
    const fresh = await createTestApp();
    try {
      // createTestApp already logged in once.
      const codes: number[] = [];
      for (let i = 0; i < 10; i++) codes.push((await fresh.login(TEST_USER.email, 'wrong-password!')).statusCode);
      expect(codes.slice(0, 9).every((c) => c === 401)).toBe(true);
      expect(codes[9]).toBe(429);
      expect((await fresh.login(TEST_USER.email, 'wrong-password!')).json().error).toBe('too_many_requests');
    } finally {
      await fresh.close();
    }
  });
});
