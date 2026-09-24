import { databaseUrl, loadEnvFile } from '../config/env';
import { createPgDb } from '../db/client';
import { seedDatabase } from '../db/seed';

loadEnvFile();
const { db, close } = createPgDb(databaseUrl());
try {
  const counts = await seedDatabase(db);
  console.table(counts);
} finally {
  await close();
}
