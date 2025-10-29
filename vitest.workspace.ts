import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    test: {
      name: 'frontend',
      include: ['src/**/*.test.{ts,tsx}', '!src/**/backend/**/*.test.ts'],
      globals: true,
      environment: 'jsdom',
      setupFiles: './vitest.setup.ts',
    },
  },
  {
    test: {
      name: 'backend',
      include: ['src/**/backend/**/*.test.ts'],
      globals: true,
      environment: 'node',
      setupFiles: './vitest.backend.setup.ts',
    },
  },
]);