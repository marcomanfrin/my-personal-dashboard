import type { Preferences, PreferencesResponse } from '@command/shared';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { endpoints } from '../api/endpoints';
import { queryKeys } from '../api/queryClient';
import { storage } from '../lib/storage';

type Key = keyof Preferences;
type Value<K extends Key> = NonNullable<Preferences[K]>;

/** Changes in a burst (dragging a layout, collapsing several cards) become one PATCH. */
const SAVE_DELAY_MS = 400;

// Shared by every hook instance: one queue, one timer, one request at a time.
const pending: Preferences = {};
let timer: ReturnType<typeof setTimeout> | undefined;
let saving = false;

/** True while a change is queued or on its way: a refetch now would bring back the old value. */
export const hasUnsavedPreferences = () => saving || Object.keys(pending).length > 0;

function queueSave(qc: QueryClient) {
  clearTimeout(timer);
  timer = setTimeout(async () => {
    if (saving) return queueSave(qc);
    const body = { ...pending };
    for (const k of Object.keys(body) as Key[]) delete pending[k];
    if (!Object.keys(body).length) return;
    saving = true;
    try {
      const saved = await endpoints.patchPreferences(body);
      // Keep what was queued meanwhile on top of the server's answer.
      qc.setQueryData<PreferencesResponse>(queryKeys.preferences, {
        ...saved,
        preferences: { ...saved.preferences, ...pending },
      });
    } catch {
      // Offline or server error: the local copy keeps the setting; the next change retries it.
      const newer = { ...pending };
      Object.assign(pending, body, newer);
    } finally {
      saving = false;
    }
  }, SAVE_DELAY_MS);
}

/**
 * One user setting, saved on the server (GET/PATCH /api/preferences) so it follows
 * the user to other browsers, with a copy in localStorage for an instant first
 * paint and for when the server is unreachable. Works like `useState`.
 */
export function usePreference<K extends Key>(key: K, localKey: string, fallback: Value<K>) {
  const qc = useQueryClient();
  const { data, isSuccess } = useQuery({
    queryKey: queryKeys.preferences,
    queryFn: endpoints.preferences,
    // Changes arrive through our own writes and the SSE `preferences.changed` event.
    staleTime: Infinity,
    refetchInterval: false,
  });
  const [local, setLocal] = useState<Value<K>>(() => storage.get(localKey, fallback));
  const server = data?.preferences[key] as Value<K> | undefined;
  const value = server ?? local;
  const latest = useRef(value);
  latest.current = value;

  // The server copy wins: mirror it locally for the next cold start.
  useEffect(() => {
    if (server !== undefined) storage.set(localKey, server);
  }, [server, localKey]);

  // First run after this setting moved to the server: upload what this browser had.
  const uploaded = useRef(false);
  useEffect(() => {
    if (!isSuccess || server !== undefined || uploaded.current) return;
    uploaded.current = true;
    if (JSON.stringify(local) !== JSON.stringify(fallback)) {
      pending[key] = local;
      queueSave(qc);
    }
  }, [isSuccess, server, local, fallback, key, qc]);

  const set = useCallback(
    (next: Value<K> | ((prev: Value<K>) => Value<K>)) => {
      const v = typeof next === 'function' ? (next as (prev: Value<K>) => Value<K>)(latest.current) : next;
      latest.current = v;
      setLocal(v);
      storage.set(localKey, v);
      qc.setQueryData<PreferencesResponse>(queryKeys.preferences, (old) => ({
        updatedAt: old?.updatedAt ?? null,
        preferences: { ...old?.preferences, [key]: v },
      }));
      pending[key] = v;
      queueSave(qc);
    },
    [key, localKey, qc],
  );

  return [value, set] as const;
}
