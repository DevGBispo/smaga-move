import {resolve} from 'node:path';import {defineConfig} from 'vite';
export default defineConfig({build:{rollupOptions:{input:{chamadas:resolve('lab/index.html'),operacao:resolve('lab/operacao.html')}}}});
