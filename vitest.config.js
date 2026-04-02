import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    conditions: ['browser'],
  },
  test: {
    root: '.',
    include: ['src/**/*.{test,spec}.{js,jsx}', 'src/**/*.svelte.{test,spec}.{js,jsx}'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest-setup.js'],
  },
});
