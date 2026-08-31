import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  server: {
    host: true,
    port: 3000,
    strictPort: true,
    watch: {
      usePolling: true,
    },
    hmr: {
      clientPort: 3000,
    },
  },
})