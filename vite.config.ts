import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
    // Improve HMR stability and separate from app WebSockets
    hmr: {
      port: 24678, // Use a different port for HMR WebSocket
      overlay: true,
      clientPort: 24678,
    },
    // Watch options to reduce unnecessary reloads
    watch: {
      ignored: ['**/node_modules/**', '**/dist/**', '**/server/**', '**/uploads/**'],
      usePolling: false,
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  // Reduce build overhead in development
  build: {
    sourcemap: true,
  },
});
