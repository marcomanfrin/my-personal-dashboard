import { buildApp } from './app';
import { loadConfig, loadEnvFile } from './config/env';
import { createPgDb } from './db/client';

loadEnvFile();
const config = loadConfig();
const handle = createPgDb(config.databaseUrl);
const app = await buildApp({ config, db: handle.db });

const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'shutting down');
  await app.close();
  await handle.close();
  process.exit(0);
};
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

try {
  await app.listen({ port: config.port, host: config.host });
} catch (err) {
  app.log.error(err);
  await handle.close();
  process.exit(1);
}
