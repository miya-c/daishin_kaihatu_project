import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { resolve } from 'path';

function stripMockScripts() {
  let isBuild = false;
  return {
    name: 'strip-mock-scripts',
    configResolved(config) {
      isBuild = config.command === 'build';
    },
    transformIndexHtml(html) {
      if (isBuild) {
        return html.replace(/<script\s+src="\/mock\/[^"]+"><\/script>\n?/g, '');
      }
    },
  };
}

export default defineConfig({
  plugins: [viteSingleFile(), stripMockScripts()],
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
    },
  },
});
