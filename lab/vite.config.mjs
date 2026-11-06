import {resolve} from 'node:path';import {defineConfig} from 'vite';
export default defineConfig({root:resolve('lab'),build:{rollupOptions:{input:{main:resolve('lab/index.html'),operacao:resolve('lab/operacao.html')}}}});
