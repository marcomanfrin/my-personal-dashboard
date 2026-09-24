import { Preferences, type PreferencesPatch, type PreferencesResponse } from '@command/shared';
import type { Db } from '../../db/client';
import type { EventBus } from '../../plugins/events-bus';
import { createPreferencesRepository, type StoredPreferences } from './repository';

/**
 * Keeps only the keys that still match the schema: a setting saved by an older
 * version of the app must not break the response, it just falls back to default.
 */
function clean(data: unknown): Preferences {
  const out: Record<string, unknown> = {};
  if (data && typeof data === 'object')
    for (const [key, value] of Object.entries(data)) {
      const field = Preferences.shape[key as keyof Preferences];
      if (field?.safeParse(value).success) out[key] = value;
    }
  return out as Preferences;
}

const toResponse = (p: StoredPreferences): PreferencesResponse => ({
  preferences: clean(p.data),
  updatedAt: p.updatedAt?.toISOString() ?? null,
});

/** Per-user dashboard settings. Saving notifies the user's other tabs over SSE. */
export function createPreferencesService({ db, bus }: { db: Db; bus: EventBus }) {
  const repo = createPreferencesRepository(db);
  return {
    get: async (userId: string) => toResponse(await repo.get(userId)),
    async update(userId: string, patch: PreferencesPatch) {
      const saved = toResponse(await repo.merge(userId, patch));
      bus.publish({ type: 'preferences.changed', data: { at: saved.updatedAt! } });
      return saved;
    },
  };
}

export type PreferencesService = ReturnType<typeof createPreferencesService>;
