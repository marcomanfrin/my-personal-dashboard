import { databaseUrl, loadEnvFile, migrationsDirOverride } from '../config/env';
import { migratePg, migrationsFolder } from '../db/client';

loadEnvFile();
const folder = migrationsFolder(migrationsDirOverride());
await migratePg(databaseUrl(), folder);
console.log(`Migrations applied from ${folder}`);
