import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    // Enable minification and compression
    minify: true,
    // Enable source maps for debugging
    sourcemap: true,
    // Split large chunks for better caching
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        main: './index-new.html',
        property_select: './html_files/main_app/property_select-new.html'
      },
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom']
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  },
  // CSS processing
  css: {
    devSourcemap: true,
    postcss: {
      plugins: []
    }
  }
})