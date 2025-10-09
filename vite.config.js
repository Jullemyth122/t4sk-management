import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';  // Note: Using resolve from 'path' for aliases

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    middlewareMode: false, // normal dev server
    // use configureServer hook
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // add COOP that allows popups
        res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
        // you usually don't need COEP — avoid setting unless required
        next();
      });
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@services': resolve(__dirname, './src/services'),
      '@config': resolve(__dirname, './src/config'),
    }
  }
})