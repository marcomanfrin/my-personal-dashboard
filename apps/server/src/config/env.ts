import { z } from 'zod';

const emptyToUndefined = (v: unknown) => (v === '' ? undefined : v);

const Env = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('127.0.0.1'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1),
  USER_NAME: z.string().default('Marco'),
  USER_ROLE: z.string().default(''),
  USER_GITHUB: z.string().default(''),
  /** HS256 key for access tokens. Generate with: node -e "console.log(crypto.randomBytes(48).toString('base64url'))" */
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).default(7),
  /** Login attempts per minute per client IP. */
  LOGIN_RATE_LIMIT: z.coerce.number().int().min(1).default(10),
  /** Send the refresh cookie over HTTPS only. Turn on in production. */
  COOKIE_SECURE: z.preprocess(emptyToUndefined, z.stringbool().default(false)),
  MIGRATIONS_DIR: z.preprocess(emptyToUndefined, z.string().optional()),
});

export interface Config {
  port: number;
  host: string;
  logLevel: z.infer<typeof Env>['LOG_LEVEL'];
  corsOrigin: string[];
  databaseUrl: string;
  /** Dashboard owner: filters the company Gantt, shown in the UI. */
  user: { name: string; role: string; githubLogin: string };
  auth: {
    jwtSecret: string;
    accessTokenTtlSeconds: number;
    refreshTokenTtlDays: number;
    loginRateLimit: number;
    cookieSecure: boolean;
  };
  migrationsDir?: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const e = Env.parse(env);
  return {
    port: e.PORT,
    host: e.HOST,
    logLevel: e.LOG_LEVEL,
    corsOrigin: e.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean),
    databaseUrl: e.DATABASE_URL,
    user: { name: e.USER_NAME, role: e.USER_ROLE, githubLogin: e.USER_GITHUB },
    auth: {
      jwtSecret: e.JWT_SECRET,
      accessTokenTtlSeconds: e.ACCESS_TOKEN_TTL_SECONDS,
      refreshTokenTtlDays: e.REFRESH_TOKEN_TTL_DAYS,
      loginRateLimit: e.LOGIN_RATE_LIMIT,
      cookieSecure: e.COOKIE_SECURE,
    },
    migrationsDir: e.MIGRATIONS_DIR,
  };
}

/** For CLI scripts that only talk to the database. */
export function databaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  return z.string().min(1, 'DATABASE_URL is required').parse(env.DATABASE_URL);
}

export function migrationsDirOverride(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return env.MIGRATIONS_DIR || undefined;
}

/** Loads the repository root .env when present. Real environment variables win. */
export function loadEnvFile(): void {
  for (const path of ['.env', '../../.env']) {
    try {
      process.loadEnvFile(path);
      return;
    } catch {
      // try the next location
    }
  }
}
