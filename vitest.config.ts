import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@app': path.resolve(__dirname, './src/app'),
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
  test: {
    environment: 'happy-dom',
    globals: false,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
