import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const require = createRequire(import.meta.url);
const pdfAssets = ['pdf.mjs', 'pdf.worker.mjs'];

function pdfRuntime() {
  const assets = new Map(pdfAssets.map((name) => [
    '/assets/' + name, readFileSync(require.resolve('pdfjs-dist/build/' + name)),
  ]));
  return {
    name: 'smaga-pdf-runtime',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const asset = assets.get(request.url?.split('?')[0]);
        if (!asset) return next();
        response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
        response.end(asset);
      });
    },
    generateBundle() {
      for (const [path, source] of assets) this.emitFile({ type: 'asset', fileName: path.slice(1), source });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    pdfRuntime(),
    {
      name: 'smaga-operacional-home',
      configureServer(server) {
        server.middlewares.use((request, _response, next) => {
          if (request.url === '/' || request.url?.startsWith('/?')) {
            request.url = '/index.html' + request.url.slice(1);
          }
          next();
        });
      },
    },
  ],
  build: {
    rollupOptions: {
      input: fileURLToPath(new URL('./acesso.html', import.meta.url)),
    },
  },
});
