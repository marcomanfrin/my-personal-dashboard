import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // PGlite boots a full Postgres in WASM: give the first migration some room.
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: { TZ: 'Europe/Rome' },
  },
});
