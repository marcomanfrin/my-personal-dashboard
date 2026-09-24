import { cpSync } from 'node:fs';
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    server: 'src/server.ts',
    'scripts/migrate': 'src/scripts/migrate.ts',
    'scripts/seed': 'src/scripts/seed.ts',
    'scripts/agent-token': 'src/scripts/agent-token.ts',
    'scripts/user': 'src/scripts/user.ts',
  },
  format: 'esm',
  platform: 'node',
  target: 'node22',
  clean: true,
  // The shared package ships TypeScript sources: bundle it instead of importing at runtime.
  noExternal: ['@command/shared'],
  onSuccess: async () => {
    cpSync('src/db/migrations', 'dist/migrations', { recursive: true });
  },
});
