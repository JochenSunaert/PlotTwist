import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/plottwist/', // 👈 Important: tells Vite to use /plottwist as the base URL
  plugins: [react()],
  server: {
    proxy: {
      '/socket.io': 'http://localhost:3001', // Proxy WebSocket requests to the backend
    },
  },
})
