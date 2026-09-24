import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { RESOURCES, type Resource, type TokenResponse } from '@command/shared';
import type { InjectOptions } from 'fastify';
import { buildApp } from '../src/app';
import { loadConfig } from '../src/config/env';
import { migrationsFolder, type Db } from '../src/db/client';
import * as schema from '../src/db/schema';
import { seedDatabase } from '../src/db/seed';

export const TEST_USER = { email: 'marco@example.com', name: 'Marco', password: 'correct horse battery' };

type App = Awaited<ReturnType<typeof buildApp>>;
type Response = Awaited<ReturnType<App['inject']>>;

export interface TestContext {
  app: App;
  db: Db;
  /** Bearer header of the logged-in test user. */
  userAuth: { authorization: string };
  /** Bearer header of an agent with every scope. */
  agentAuth: { authorization: string };
  /** `app.inject` authenticated as the user unless `headers` are given. */
  inject(opts: InjectOptions): Promise<Response>;
  login(email?: string, password?: string): Promise<Response>;
  newAgent(name: string, scopes: Resource[]): Promise<{ authorization: string }>;
  close(): Promise<void>;
}

/** A full app on an in-memory Postgres (PGlite), migrated with the real migrations and seeded with the demo data. */
export async function createTestApp(env: Record<string, string> = {}): Promise<TestContext> {
  const client = new PGlite();
  const db = drizzle(client, { schema }) as unknown as Db;
  await migrate(drizzle(client), { migrationsFolder: migrationsFolder() });
  await seedDatabase(db);

  const config = loadConfig({
    DATABASE_URL: 'pglite://memory',
    USER_NAME: 'Marco',
    LOG_LEVEL: 'silent',
    JWT_SECRET: 'test-secret-that-is-long-enough-for-hs256',
    ...env,
  });
  const app = await buildApp({ config, db, logger: false });
  await app.ready();
  await app.container.users.createUser(TEST_USER.email, TEST_USER.name, TEST_USER.password);

  const login = (email = TEST_USER.email, password = TEST_USER.password) =>
    app.inject({ method: 'POST', url: '/api/auth/login', payload: { email, password } });
  const session = (await login()).json<TokenResponse>();
  const userAuth = { authorization: `Bearer ${session.accessToken}` };

  const newAgent = async (name: string, scopes: Resource[]) => {
    const { token } = await app.container.agents.register(name, scopes);
    return { authorization: `Bearer ${token}` };
  };

  return {
    app,
    db,
    userAuth,
    agentAuth: await newAgent('test-agent', [...RESOURCES]),
    inject: (opts) => app.inject({ ...opts, headers: opts.headers ?? userAuth }),
    login,
    newAgent,
    async close() {
      await app.close();
      await client.close();
    },
  };
}

/** The refresh cookie set by a login/refresh response, as a `cookie` header value. */
export function refreshCookieOf(res: Response): string {
  const c = res.cookies.find((x) => x.name === 'cmd_refresh');
  if (!c) throw new Error('no refresh cookie');
  return `cmd_refresh=${c.value}`;
}
