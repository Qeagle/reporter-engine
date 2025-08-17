import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 80, // Frontend runs on 80
    host: '0.0.0.0', // Allow external connections
    proxy: {
      '/api': {
        target: 'http://localhost:3001', // Backend runs on 3001
        changeOrigin: true,
        secure: false,
      },
    },
    hmr: {
      port: 24678,
      // For remote access, use the actual server IP instead of localhost
      host: process.env.VITE_HMR_HOST || 'localhost',
      overlay: true,
    },
    watch: {
      ignored: ['**/node_modules/**', '**/dist/**', '**/server/**', '**/uploads/**'],
      usePolling: true, // Enable polling for remote file systems
      interval: 1000,
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    sourcemap: true,
  },
});
