import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Production configuration for same-machine deployment
export default defineConfig({
  plugins: [react()],
  server: {
    port: 80, // Frontend runs on port 80
    host: '0.0.0.0', // Allow external connections
    proxy: {
      '/api': {
        target: 'http://localhost:3001', // Backend runs on port 3001
        changeOrigin: true,
        secure: false,
      },
    },
    hmr: false, // Disable HMR for production
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable sourcemaps in production
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          charts: ['chart.js', 'react-chartjs-2'],
          ui: ['lucide-react', '@heroicons/react'],
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env.VITE_API_URL': JSON.stringify('http://localhost:3001'),
  },
});
