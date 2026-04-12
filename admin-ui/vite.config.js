import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { resolve } from 'path';
import { readFileSync, writeFileSync } from 'fs';

function gasCompat() {
  return {
    name: 'gas-compat',
    closeBundle() {
      const htmlPath = resolve(__dirname, 'dist/index.html');
      let html = readFileSync(htmlPath, 'utf8');
      html = html.replace(/<script\s+type="module"\s*crossorigin>/g, '<script>');
      html = html.replace(/<script\s+src="\/mock\/[^"]+"><\/script>\n?/g, '');

      const scriptMatch = html.match(/<script>[\s\S]*?<\/script>/);
      if (scriptMatch && !html.includes('</body>')) return;
      if (scriptMatch) {
        const scriptBlock = scriptMatch[0];
        html = html.replace(scriptBlock, '');
        html = html.replace('</body>', scriptBlock + '\n  </body>');
      }

      writeFileSync(htmlPath, html);
    },
  };
}

export default defineConfig({
  plugins: [viteSingleFile(), gasCompat()],
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
      output: {
        format: 'iife',
      },
    },
  },
});
