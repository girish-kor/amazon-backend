import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    reporters: ['default', 'html'],
    outputFile: {
      html: './test-results/integration.html',
    },
    testTimeout: 30000,
  },
});
