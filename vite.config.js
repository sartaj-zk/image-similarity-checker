import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // In dev, `netlify dev` handles this. If running vite alone:
      '/api': {
        target: 'http://localhost:8888/.netlify/functions',
        rewrite: path => path.replace(/^\/api/, ''),
        changeOrigin: true,
      },
    },
  },
})
