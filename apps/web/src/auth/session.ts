import type { ApiError, AuthUser, LoginBody, TokenResponse } from '@argus/shared';

/**
 * The browser session. The access token lives only in memory (never in storage);
 * the refresh token is an httpOnly cookie the browser sends to /api/auth itself.
 */
export interface Session {
  accessToken: string;
  user: AuthUser;
  expiresAt: number;
}

/** Renew this long before the access token expires. */
const RENEW_BEFORE_MS = 60_000;

let current: Session | null = null;
let renewTimer: ReturnType<typeof setTimeout> | undefined;
let inflight: Promise<Session | null> | null = null;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

function set(next: Session | null) {
  current = next;
  clearTimeout(renewTimer);
  if (next) {
    const delay = Math.max(5_000, next.expiresAt - Date.now() - RENEW_BEFORE_MS);
    renewTimer = setTimeout(() => void refresh(), delay);
  }
  emit();
}

const fromResponse = (r: TokenResponse): Session => ({
  accessToken: r.accessToken,
  user: r.user,
  expiresAt: Date.now() + r.expiresIn * 1000,
});

export class AuthError extends Error {}

async function authCall(path: string, body?: unknown): Promise<Response> {
  return fetch(`/api/auth/${path}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

export const session = {
  get: () => current,
  token: () => current?.accessToken ?? null,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => void listeners.delete(listener);
  },
};

export async function login(credentials: LoginBody): Promise<Session> {
  const res = await authCall('login', credentials);
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as ApiError | null;
    throw new AuthError(
      res.status === 429
        ? 'Too many attempts. Wait a minute and try again.'
        : res.status === 401
          ? 'Wrong email or password.'
          : (err?.message ?? 'Sign in failed.'),
    );
  }
  const s = fromResponse(await res.json());
  set(s);
  return s;
}

/**
 * Exchanges the refresh cookie for a new access token. Concurrent callers share
 * one request: the server rotates the cookie, so two parallel refreshes would
 * make the second one fail.
 */
export function refresh(): Promise<Session | null> {
  inflight ??= (async () => {
    try {
      const res = await authCall('refresh');
      if (!res.ok) {
        set(null);
        return null;
      }
      const s = fromResponse(await res.json());
      set(s);
      return s;
    } catch {
      // Network error: keep the current session, the next call will retry.
      return current;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export async function logout(): Promise<void> {
  try {
    await authCall('logout');
  } finally {
    set(null);
  }
}

/** Drops the session locally (e.g. refresh rejected mid-request). */
export const expire = () => set(null);
