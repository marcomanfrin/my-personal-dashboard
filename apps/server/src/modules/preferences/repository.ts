import type { Preferences } from '@command/shared';
import { eq, sql } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { userPreferences } from '../../db/schema';

export interface StoredPreferences {
  data: Preferences;
  updatedAt: Date | null;
}

export function createPreferencesRepository(db: Db) {
  return {
    async get(userId: string): Promise<StoredPreferences> {
      const [row] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
      return row ? { data: row.data, updatedAt: row.updatedAt } : { data: {}, updatedAt: null };
    },

    /**
     * Shallow merge in one statement (jsonb `||`): two tabs saving different keys
     * at the same time cannot overwrite each other.
     */
    async merge(userId: string, patch: Preferences): Promise<StoredPreferences> {
      const [row] = await db
        .insert(userPreferences)
        .values({ userId, data: patch })
        .onConflictDoUpdate({
          target: userPreferences.userId,
          set: { data: sql`${userPreferences.data} || excluded.data`, updatedAt: sql`now()` },
        })
        .returning();
      return { data: row!.data, updatedAt: row!.updatedAt };
    },
  };
}
