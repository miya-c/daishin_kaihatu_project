import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Enable minification and compression
    minify: true,
    // Enable source maps for debugging
    sourcemap: true,
    // Split large chunks for better caching
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom']
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true,
    historyApiFallback: true
  },
  // CSS processing
  css: {
    devSourcemap: true,
    postcss: {
      plugins: []
    }
  }
})