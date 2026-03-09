
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

  export default defineConfig({
  plugins: [react(), tailwindcss()],
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      target: 'esnext',
      outDir: 'dist',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (id.includes('remark-gfm') || id.includes('react-markdown')) return 'vendor-markdown';
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('react-router') || id.includes('react-dom') || id.includes('/react/')) return 'vendor-react';
            if (id.includes('@radix-ui')) return 'vendor-ui';
          },
        },
      },
    },
    server: {
      port: 5173,
      open: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          // 백엔드에 setGlobalPrefix('api')가 설정되어 있으므로 rewrite 제거
          // 프론트엔드: /api/teas -> 백엔드: /api/teas
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: true,
      mockReset: true,
      restoreMocks: true,
      clearMocks: true,
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/backend/**',
        '**/*.config.*',
      ],
    },
  });