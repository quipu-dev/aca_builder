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
          if (!id.includes('node_modules')) return;

          // 核心代码编辑器完整生态
          if (
            id.includes('/node_modules/@codemirror/') ||
            id.includes('/node_modules/@uiw/') ||
            id.includes('/node_modules/@lezer/') ||
            id.includes('/node_modules/codemirror/')
          ) {
            return 'vendor-codemirror';
          }

          // 拓扑图与 DAG 完整生态
          if (id.includes('/node_modules/@xyflow/') || id.includes('/node_modules/@dagrejs/')) {
            return 'vendor-xyflow';
          }

          // React 核心基础运行时
          if (
            id.includes('/node_modules/react/') ||
            id.includes('/node_modules/react-dom/') ||
            id.includes('/node_modules/scheduler/') ||
            id.includes('/node_modules/zustand/')
          ) {
            return 'vendor-react';
          }
        },
      },
    },
  },
});
