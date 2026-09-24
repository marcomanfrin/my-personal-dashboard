import type { AuthUser } from '@argus/shared';
import { and, eq, isNull } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { refreshTokens, users } from '../../db/schema';
import { toDto } from '../../lib/serialize';

const publicColumns = {
  id: users.id,
  email: users.email,
  name: users.name,
  createdAt: users.createdAt,
  lastLoginAt: users.lastLoginAt,
};

export type RefreshTokenRow = typeof refreshTokens.$inferSelect;

export function createAuthRepository(db: Db) {
  return {
    async createUser(email: string, name: string, passwordHash: string): Promise<AuthUser> {
      const [row] = await db.insert(users).values({ email, name, passwordHash }).returning(publicColumns);
      return toDto<AuthUser>(row!);
    },

    async setPassword(email: string, passwordHash: string): Promise<AuthUser | null> {
      const [row] = await db.update(users).set({ passwordHash }).where(eq(users.email, email)).returning(publicColumns);
      return row ? toDto<AuthUser>(row) : null;
    },

    /** Includes the password hash: for login only. */
    async findCredentials(email: string) {
      const [row] = await db
        .select({ ...publicColumns, passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      return row ?? null;
    },

    async getUser(id: string): Promise<AuthUser | null> {
      const [row] = await db.select(publicColumns).from(users).where(eq(users.id, id)).limit(1);
      return row ? toDto<AuthUser>(row) : null;
    },

    async touchLogin(id: string): Promise<AuthUser> {
      const [row] = await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, id))
        .returning(publicColumns);
      return toDto<AuthUser>(row!);
    },

    async insertRefreshToken(v: { userId: string; tokenHash: string; expiresAt: Date; userAgent: string | null }) {
      const [row] = await db.insert(refreshTokens).values(v).returning();
      return row!;
    },

    async findRefreshToken(tokenHash: string): Promise<RefreshTokenRow | null> {
      const [row] = await db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash)).limit(1);
      return row ?? null;
    },

    /** Revokes the token if still active; returns false when someone else revoked it first. */
    async revokeRefreshToken(id: string, replacedBy: string | null = null): Promise<boolean> {
      const rows = await db
        .update(refreshTokens)
        .set({ revokedAt: new Date(), replacedBy })
        .where(and(eq(refreshTokens.id, id), isNull(refreshTokens.revokedAt)))
        .returning({ id: refreshTokens.id });
      return rows.length > 0;
    },

    async revokeAllForUser(userId: string): Promise<void> {
      await db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
    },
  };
}

export type AuthRepository = ReturnType<typeof createAuthRepository>;
