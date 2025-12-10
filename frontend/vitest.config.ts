import { defineConfig } from 'vitest/config';
import react from '@astrojs/react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: [
      'src/**/__tests__/**/*.{test,spec}.{ts,tsx}',
      'src/**/*.{test,spec}.{ts,tsx}', // Keep for flexibility
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'src/lib/auth/**',
        'src/components/auth/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
