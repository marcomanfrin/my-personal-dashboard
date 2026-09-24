import { z } from 'zod';
import { IsoDate } from './common';

export const LoginBody = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(1024),
});
export type LoginBody = z.infer<typeof LoginBody>;

/** A dashboard user account (never includes the password hash). */
export const AuthUser = z.object({
  id: z.uuid(),
  email: z.email(),
  name: z.string(),
  createdAt: IsoDate,
  lastLoginAt: IsoDate.nullable(),
});
export type AuthUser = z.infer<typeof AuthUser>;

/**
 * Returned by login and refresh. The access token is a short-lived JWT to send as
 * `Authorization: Bearer`; the refresh token travels only in an httpOnly cookie.
 */
export interface TokenResponse {
  accessToken: string;
  tokenType: 'Bearer';
  /** Seconds until the access token expires. */
  expiresIn: number;
  user: AuthUser;
}
