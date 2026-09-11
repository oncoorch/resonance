import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  root: 'apps/web',
  plugins: [react()],
  resolve: { alias: { '@core': path.resolve(__dirname, 'packages/core/src') } },
  server: { host: '127.0.0.1', port: 4173, strictPort: true, proxy: { '/api': 'http://127.0.0.1:4888' } },
  build: { outDir: '../../dist/web', emptyOutDir: true },
});
