import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 43700,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://127.0.0.1:43699',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../src/aca_builder/server/static',
    emptyOutDir: true,
    chunkSizeWarningLimit: 600,
    // 显式关闭代码与样式压缩，确保构建产物对 git 历史追踪友好
    minify: false,
    cssMinify: false,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('zustand')) {
              return 'vendor-react';
            }
            if (id.includes('@xyflow')) {
              return 'vendor-xyflow';
            }
            if (id.includes('codemirror') || id.includes('@uiw')) {
              return 'vendor-codemirror';
            }
            return 'vendor-others';
          }
        },
      },
    },
  },
});
