import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: {
    port: 5173,
    host: '127.0.0.1',           // ← This is the key change for Brave
    strictPort: true,

    // Important header for Google & Facebook OAuth popups (you already had this)
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },

    // Extra help for aggressive blockers like Brave
    fs: {
      strict: false,             // prevents some "forbidden" module warnings
    },
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@services': resolve(__dirname, './src/services'),
      '@config': resolve(__dirname, './src/config'),
    },
  },

  // Nice-to-have dev improvements
  optimizeDeps: {
    include: ['react', 'react-dom', 'gsap', 'firebase/app', 'firebase/auth'],
  },

  build: {
    sourcemap: true,
  },
})