import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  adapter: node({
    mode: 'standalone',
  }),
  vite: {
    plugins: [tailwindcss(), tsconfigPaths()],
    envDir: '..',
    envPrefix: ['VITE_', 'SUPABASE_', 'PUBLIC_'],
  },
});
