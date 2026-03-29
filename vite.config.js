import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const projectRoot = resolve(__dirname);
const pagesRoot = resolve(__dirname, 'src/pages');

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: resolve(projectRoot, 'manifest.json'), dest: '.' },
        { src: resolve(projectRoot, '_headers'), dest: '.' },
        { src: resolve(projectRoot, '_redirects'), dest: '.' },
        { src: resolve(projectRoot, 'csv'), dest: '.' },
        { src: resolve(projectRoot, 'gas_scripts'), dest: '.' },
        { src: resolve(projectRoot, 'pwa-utils.js'), dest: '.' },
        { src: resolve(projectRoot, 'src/sw/service-worker.js'), dest: '.' },
      ],
    }),
  ],
  root: pagesRoot,
  build: {
    rollupOptions: {
      input: {
        main: resolve(pagesRoot, 'index.html'),
        property: resolve(pagesRoot, 'property/index.html'),
        room: resolve(pagesRoot, 'room/index.html'),
        reading: resolve(pagesRoot, 'reading/index.html'),
      },
    },
    outDir: resolve(projectRoot, 'dist'),
    emptyOutDir: true,
  },
});
