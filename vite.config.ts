import { defineConfig } from 'vite'
import path from 'path'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  define: {
    global: {},
  },
  server: {
    host: "localhost",
  },
  build: {
    assetsInlineLimit: 0,
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
        '@types': path.resolve(__dirname, './src/@types'),
        '@assets': path.resolve(__dirname, './src/assets'),
        '@components': path.resolve(__dirname, './src/components'),
        '@constants': path.resolve(__dirname, './src/constants'),
        '@data': path.resolve(__dirname, './src/data'),
        '@enums': path.resolve(__dirname, './src/enums'),
        '@views': path.resolve(__dirname, './src/views')
    },
  },
});