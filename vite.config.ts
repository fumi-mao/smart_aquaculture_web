import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const proxyConfig = {
  '/api': {
    target: 'https://api.pondrobotics.com',
    changeOrigin: true,
    secure: false,
  },
  '/oauth': {
    target: 'https://api.pondrobotics.com',
    changeOrigin: true,
    secure: false,
  },
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [
        tailwindcss,
        autoprefixer,
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: proxyConfig
  },
  preview: {
    proxy: proxyConfig
  }
})
