import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@nestjs/common': path.resolve(__dirname, 'tests/stubs/nestjs-common.js'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
    reporters: ['default'],
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});
