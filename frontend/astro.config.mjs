import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://astro.build/config
export default defineConfig({
  output: 'server', // CRITICAL: Required for SSR middleware to run on page requests
  integrations: [react()],
  adapter: node({
    mode: 'standalone',
  }),
  vite: {
    plugins: [tailwindcss(), tsconfigPaths()],
    envDir: '..',
    envPrefix: ['VITE_', 'SUPABASE_', 'PUBLIC_'],
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
  },
});

