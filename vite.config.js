import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { visualizer } from 'rollup-plugin-visualizer';

const projectRoot = resolve(__dirname);
const pagesRoot = resolve(__dirname, 'src/pages');
const isAnalyze = process.env.ANALYZE === 'true';

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
        { src: resolve(projectRoot, 'src/pwa-utils.js'), dest: '.' },
        { src: resolve(projectRoot, 'src/sw/service-worker.js'), dest: '.' },
      ],
    }),
    isAnalyze && visualizer({ open: true, filename: 'bundle-analysis.html' }),
  ],
  root: pagesRoot,
  build: {
    target: 'es2020',
    cssTarget: 'es2020',
    sourcemap: false,
    minify: 'esbuild',
    cssMinify: true,
    rollupOptions: {
      input: {
        main: resolve(pagesRoot, 'index.html'),
        property: resolve(pagesRoot, 'property/index.html'),
        room: resolve(pagesRoot, 'room/index.html'),
        reading: resolve(pagesRoot, 'reading/index.html'),
      },
      output: {
        compact: true,
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
        },
      },
    },
    outDir: resolve(projectRoot, 'dist'),
    emptyOutDir: true,
  },
});
