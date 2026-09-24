import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import * as schema from './schema';

export type Schema = typeof schema;
/** A database or a transaction: PgTransaction extends PgDatabase, so repositories accept both. */
export type Db = PgDatabase<PgQueryResultHKT, Schema>;

export interface DbHandle {
  db: Db;
  close(): Promise<void>;
}

export function createPgDb(url: string): DbHandle {
  const pool = new pg.Pool({ connectionString: url, max: 10 });
  const db = drizzle(pool, { schema }) as unknown as Db;
  return { db, close: () => pool.end() };
}

/**
 * The migrations folder: MIGRATIONS_DIR, else `migrations/` next to the bundle (dist),
 * else src/db/migrations of this package (dev, tsx).
 */
export function migrationsFolder(override?: string): string {
  if (override) return override;
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    if (existsSync(join(dir, 'migrations', 'meta'))) return join(dir, 'migrations');
    const pkg = join(dir, 'package.json');
    if (existsSync(pkg) && JSON.parse(readFileSync(pkg, 'utf8')).name === '@command/server')
      return join(dir, 'src', 'db', 'migrations');
    dir = dirname(dir);
  }
  throw new Error('Cannot locate the migrations folder; set MIGRATIONS_DIR');
}

export async function migratePg(url: string, folder: string): Promise<void> {
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: folder });
  } finally {
    await pool.end();
  }
}
