import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
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
            if (id.includes('recharts') || id.includes('d3')) {
              return 'charts-vendor';
            }
            
            // Icon libraries
            if (id.includes('lucide-react')) {
              return 'icons-vendor';
            }
            
            // Form libraries
            if (id.includes('react-hook-form') || id.includes('yup')) {
              return 'forms-vendor';
            }
            
            // All other node_modules
            return 'vendor';
          }
          
          // Split pages into separate chunks
          if (id.includes('/src/pages/')) {
            const pageName = id.split('/src/pages/')[1].split('.')[0];
            return `page-${pageName}`;
          }
        }
      }
    },
    chunkSizeWarningLimit: 600,
    sourcemap: false, // Disable sourcemaps in production
    minify: 'terser', // Use terser for better minification
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
      },
    },
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