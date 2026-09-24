import type { ApiError } from '@argus/shared';
import { expire, refresh, session } from '../auth/session';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiError | null,
  ) {
    super(body?.message ?? `Request failed (${status})`);
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const send = (method: Method, path: string, body: unknown, token: string | null) =>
  fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: {
      ...(body !== undefined && { 'content-type': 'application/json' }),
      ...(token && { authorization: `Bearer ${token}` }),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

/**
 * JSON request with the access token. On 401 it refreshes once and retries;
 * if the refresh fails too the session is dropped and the app shows the login.
 */
async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  let res = await send(method, path, body, session.token());
  if (res.status === 401) {
    const renewed = await refresh();
    if (renewed) res = await send(method, path, body, renewed.accessToken);
    if (res.status === 401) expire();
  }
  if (!res.ok) throw new HttpError(res.status, (await res.json().catch(() => null)) as ApiError | null);
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: (path: string) => request<void>('DELETE', path),
};
