import { defineConfig } from 'vitest/config';
import path from 'path';

/** AI-testsættet: rigtige AI-kald, så det køres kun med `npm run eval:ai`. */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.eval.ts'],
    testTimeout: 30 * 60_000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
