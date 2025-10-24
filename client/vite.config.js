import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Split node_modules into separate chunks
          if (id.includes('node_modules')) {
            // React core libraries
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            
            // Chart libraries
            if (id.includes('recharts')) {
              return 'charts-vendor';
            }
            
            // Icon libraries
            if (id.includes('lucide-react')) {
              return 'icons-vendor';
            }
            
            // All other node_modules
            return 'vendor';
          }
        }
      }
    },
    chunkSizeWarningLimit: 600,
    sourcemap: false,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})