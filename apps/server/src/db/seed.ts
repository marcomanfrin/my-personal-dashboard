import { RESOURCE_SCHEMAS, RESOURCES } from '@argus/shared';
import { RESOURCE_REPOSITORIES } from '../modules/registry';
import type { Db } from './client';
import { demoData } from './seed-data';

/**
 * Loads the demo data as if an agent had synced it (agentId null: owned by no
 * agent, so no agent's `replace` sync will delete it). Idempotent.
 */
export async function seedDatabase(db: Db, now = new Date()): Promise<Record<string, number>> {
  const data = demoData(now);
  const counts: Record<string, number> = {};
  await db.transaction(async (tx) => {
    for (const resource of RESOURCES) {
      const items = data[resource].map((it) => RESOURCE_SCHEMAS[resource].input.parse(it) as Record<string, unknown>);
      const rows = await RESOURCE_REPOSITORIES[resource](tx).upsertMany(items, { agentId: null, syncedAt: now });
      counts[resource] = rows.length;
    }
  });
  return counts;
}
