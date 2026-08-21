import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  // Relative base path: required for the packaged Electron app, which
  // loads dist/index.html over `file://`. Absolute paths like
  // `/assets/index-xxx.js` would resolve to the filesystem root
  // (e.g. `file:///C:/assets/...` on Windows) and 404. With
  // `base: './'`, Vite emits `<script src="./assets/...">` so each
  // URL resolves relative to the HTML file's own directory.
  base: './',
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
    // Inline bundled tileset PNGs (all < 10 KB) as data URLs. Same
    // `file://` reasoning as `base: './'` — relative paths would
    // still work for PNGs, but data URLs sidestep any future path
    // resolution edge cases.
    assetsInlineLimit: 100_000,
  },
});
