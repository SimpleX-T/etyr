import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Dedicated library build for the content script.
// Content scripts in Manifest V3 cannot be ES modules, so this must be a
// self-contained IIFE bundle with its CSS emitted to a stable path.
// Uses Preact (3KB) instead of React for smaller content script bundle.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Use Preact for the content script to minimize bundle size
      'react': 'preact/compat',
      'react-dom': 'preact/compat',
      'react-dom/client': 'preact/compat/client',
      'react/jsx-runtime': 'preact/jsx-runtime',
      '@shared': resolve(__dirname, 'src/shared'),
      '@browser': resolve(__dirname, 'src/browser'),
      '@storage': resolve(__dirname, 'src/storage'),
      '@dictionary': resolve(__dirname, 'src/dictionary'),
      '@content': resolve(__dirname, 'src/content'),
      '@popup': resolve(__dirname, 'src/popup'),
      '@options': resolve(__dirname, 'src/options'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: false,
    assetsInlineLimit: 100000000,
    target: 'es2022',
    minify: 'esbuild',
    cssMinify: true,
    cssCodeSplit: false,
    lib: {
      entry: resolve(__dirname, 'src/content/index.ts'),
      formats: ['iife'],
      name: 'EtyrContentBundle',
      fileName: () => 'content/content.js',
      cssFileName: 'content/content',
    },
  },
});