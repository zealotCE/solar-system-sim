import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig(({ isPreview }) => ({
  appType: isPreview ? 'mpa' : 'spa',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 4317,
    host: true,
    strictPort: true,
  },
  preview: {
    port: 4317,
    host: true,
    strictPort: true,
  },
}))
