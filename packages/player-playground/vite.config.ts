import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5181,
  },
  resolve: {
    alias: {
      // Resolve workspace packages from source for instant hot-reload
      // and to avoid stale dist/cache issues
      '@rendervid/renderer-browser': path.resolve(__dirname, '../renderer-browser/src/index.ts'),
      '@rendervid/core': path.resolve(__dirname, '../core/src/index.ts'),
      '@rendervid/player': path.resolve(__dirname, '../player/src/index.ts'),
      'lottie-web': '/src/stubs/lottie-web.ts',
    },
  },
});
