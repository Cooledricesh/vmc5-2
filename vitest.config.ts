import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    exclude: ['**/node_modules/**', '**/dist/**', '**/tests-e2e/**', '**/.{idea,git,cache,output,temp}/**'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});