import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@app': path.resolve(__dirname, './src/app'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@core': path.resolve(__dirname, './src/core'),
      '@editor': path.resolve(__dirname, './src/editor'),
      '@canvas': path.resolve(__dirname, './src/canvas'),
      '@panels': path.resolve(__dirname, './src/panels'),
      '@layout': path.resolve(__dirname, './src/layout'),
      '@state': path.resolve(__dirname, './src/state'),
      '@systems': path.resolve(__dirname, './src/systems'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@local-types': path.resolve(__dirname, './src/types'),
      '@styles': path.resolve(__dirname, './src/styles'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    // Inline bundled tileset PNGs (all < 10 KB) as data URLs. The packaged
    // Electron app loads dist/index.html over file://, where absolute asset
    // paths (`/assets/...`) do not resolve — data URLs sidestep that entirely.
    assetsInlineLimit: 100_000,
  },
});
