import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
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
