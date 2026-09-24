import type { AuthUser } from '@argus/shared';
import type { Db } from '../../db/client';
import { badRequest, conflict, notFound } from '../../lib/errors';
import { hashPassword, MIN_PASSWORD_LENGTH } from './password';
import { createAuthRepository } from './repository';

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

function assertPassword(password: string) {
  if (password.length < MIN_PASSWORD_LENGTH)
    throw badRequest(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
}

/** Account management (CLI, admin). Needs no JWT secret. */
export function createUsersService({ db }: { db: Db }) {
  const repo = createAuthRepository(db);
  return {
    async createUser(email: string, name: string, password: string): Promise<AuthUser> {
      assertPassword(password);
      const normalized = normalizeEmail(email);
      if (await repo.findCredentials(normalized)) throw conflict(`User ${normalized} already exists`);
      return repo.createUser(normalized, name, await hashPassword(password));
    },

    /** Changing the password signs out every device. */
    async setPassword(email: string, password: string): Promise<AuthUser> {
      assertPassword(password);
      const user = await repo.setPassword(normalizeEmail(email), await hashPassword(password));
      if (!user) throw notFound('user');
      await repo.revokeAllForUser(user.id);
      return user;
    },
  };
}

export type UsersService = ReturnType<typeof createUsersService>;
