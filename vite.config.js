import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5180,
    proxy: {
      '/api': 'http://localhost:5181',
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5180,
  },
})
