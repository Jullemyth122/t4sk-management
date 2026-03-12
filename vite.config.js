import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import express from 'express'
import fs from 'node:fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function apiPlugin() {
  return {
    name: 'api-plugin',
    configureServer(server) {
      const app = express()
      app.use('/api', express.json())

      app.all('/api/:route', async (req, res) => {
        try {
          const routeFile = resolve(__dirname, 'api', `${req.params.route}.js`)
          if (fs.existsSync(routeFile)) {
            const moduleUrl = `file://${routeFile}?t=${Date.now()}`
            const module = await import(moduleUrl)
            const handler = module.default
            
            if (typeof handler === 'function') {
              return handler(req, res)
            } else {
              return res.status(500).json({ error: 'Default export is not a function' })
            }
          }
          res.status(404).json({ error: 'API route not found' })
        } catch (err) {
          console.error('[API Error]:', err)
          res.status(500).json({ error: err.message })
        }
      })

      server.middlewares.use(app)
    }
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  process.env = { ...process.env, ...env }

  return {
    plugins: [react(), tailwindcss(), apiPlugin()],

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
  }
})