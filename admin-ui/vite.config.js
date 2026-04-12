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

      // GAS strips </script> from large inline scripts. Workaround: store code
      // in a non-executing <script type="text/plain"> and eval it dynamically.
      const marker = '<script>(function()';
      const blockStart = html.indexOf(marker);
      if (blockStart !== -1) {
        const contentStart = blockStart + '<script>'.length;
        const realClose = html.lastIndexOf('</script>');
        if (realClose > contentStart) {
          const code = html.substring(contentStart, realClose);
          html =
            html.substring(0, blockStart) +
            '<script type="text/plain" id="alpine-code">' +
            code +
            '</script>' +
            '<script>document.addEventListener("DOMContentLoaded",function(){' +
            'var c=document.getElementById("alpine-code").textContent;' +
            'var s=document.createElement("script");' +
            's.textContent=c;document.body.appendChild(s);' +
            '});</script>' +
            html.substring(realClose + '</script>'.length);
        }
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
