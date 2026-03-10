import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

import express from 'express';
import createStripeHandler from './api/create-stripe.js';
import createPaymongoHandler from './api/create-paymongo.js';
import verifyPaymongoHandler from './api/verify-paymongo.js';
import webhookPaymongoHandler from './api/webhook-paymongo.js';

function vercelApiMockPlugin(envMap = {}) {
  return {
    name: 'vercel-api-mock',
    configureServer(server) {
      if (envMap.STRIPE_SECRET_KEY) process.env.STRIPE_SECRET_KEY = envMap.STRIPE_SECRET_KEY;
      if (envMap.PAYMONGO_SECRET_KEY) process.env.PAYMONGO_SECRET_KEY = envMap.PAYMONGO_SECRET_KEY;
      
      const app = express();
      app.use(express.json());
      app.post('/api/create-stripe', createStripeHandler);
      app.post('/api/create-paymongo', createPaymongoHandler);
      app.post('/api/verify-paymongo', verifyPaymongoHandler);
      app.post('/api/webhook-paymongo', webhookPaymongoHandler);
      server.middlewares.use(app);
    }
  }
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss(), vercelApiMockPlugin(env)],

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