import { createHash, randomBytes } from 'node:crypto';
import type { AuthUser, LoginBody, TokenResponse } from '@command/shared';
import type { Config } from '../../config/env';
import type { Db } from '../../db/client';
import { unauthorized } from '../../lib/errors';
import { createAccessTokens, type AccessClaims } from './access-tokens';
import { dummyPasswordHash, verifyPassword } from './password';
import { createAuthRepository } from './repository';
import { normalizeEmail } from './users';

/**
 * A refresh token revoked this recently by rotation is treated as a race between
 * two tabs refreshing at once, not as theft: reject it without revoking every session.
 */
const ROTATION_GRACE_MS = 30_000;

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export interface Session extends TokenResponse {
  /** Goes into the httpOnly cookie, never into a response body. */
  refreshToken: string;
  refreshExpiresAt: Date;
}

export function createAuthService({ db, config }: { db: Db; config: Config }) {
  const repo = createAuthRepository(db);
  const tokens = createAccessTokens({
    secret: config.auth.jwtSecret,
    ttlSeconds: config.auth.accessTokenTtlSeconds,
  });
  const invalid = () => unauthorized('Invalid email or password');

  /** Access token + a new refresh token row (its id is needed to link a rotation). */
  async function openSession(
    user: AuthUser,
    userAgent: string | null,
    tx: Db = db,
  ): Promise<{ session: Session; rowId: string }> {
    const refreshToken = randomBytes(32).toString('base64url');
    const refreshExpiresAt = new Date(Date.now() + config.auth.refreshTokenTtlDays * 86_400_000);
    const row = await createAuthRepository(tx).insertRefreshToken({
      userId: user.id,
      tokenHash: sha256(refreshToken),
      expiresAt: refreshExpiresAt,
      userAgent,
    });
    return {
      rowId: row.id,
      session: {
        accessToken: tokens.sign({ sub: user.id, email: user.email, name: user.name }),
        tokenType: 'Bearer',
        expiresIn: tokens.ttlSeconds,
        user,
        refreshToken,
        refreshExpiresAt,
      },
    };
  }

  return {
    verifyAccessToken: (token: string): AccessClaims | null => tokens.verify(token),

    async login({ email, password }: LoginBody, userAgent: string | null): Promise<Session> {
      const creds = await repo.findCredentials(normalizeEmail(email));
      if (!creds) {
        await verifyPassword(password, await dummyPasswordHash());
        throw invalid();
      }
      if (!(await verifyPassword(password, creds.passwordHash))) throw invalid();
      const user = await repo.touchLogin(creds.id);
      return (await openSession(user, userAgent)).session;
    },

    /** Rotates the refresh token: the presented one is revoked and replaced. */
    async refresh(refreshToken: string | undefined, userAgent: string | null): Promise<Session> {
      if (!refreshToken) throw unauthorized('No session');
      const row = await repo.findRefreshToken(sha256(refreshToken));
      if (!row) throw unauthorized('Invalid session');

      if (row.revokedAt) {
        const benignRace = row.replacedBy && Date.now() - row.revokedAt.getTime() < ROTATION_GRACE_MS;
        if (!benignRace) await repo.revokeAllForUser(row.userId);
        throw unauthorized('Session revoked');
      }
      if (row.expiresAt.getTime() <= Date.now()) throw unauthorized('Session expired');

      const user = await repo.getUser(row.userId);
      if (!user) throw unauthorized('Invalid session');

      return db.transaction(async (tx) => {
        const next = await openSession(user, userAgent, tx);
        // Lost the race to a concurrent refresh with the same token: refuse (rolls back `next`).
        if (!(await createAuthRepository(tx).revokeRefreshToken(row.id, next.rowId)))
          throw unauthorized('Session revoked');
        return next.session;
      });
    },

    async logout(refreshToken: string | undefined): Promise<void> {
      if (!refreshToken) return;
      const row = await repo.findRefreshToken(sha256(refreshToken));
      if (row) await repo.revokeRefreshToken(row.id);
    },

    async me(userId: string): Promise<AuthUser> {
      const user = await repo.getUser(userId);
      if (!user) throw unauthorized('User no longer exists');
      return user;
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
