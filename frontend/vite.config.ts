import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Reachable from other devices on the LAN (integrated-GPU laptop fps check)
    host: true,
    port: 5173,
    // Backend (docker compose) behind the same origin: no CORS, session cookie just works.
    // xfwd sends X-Forwarded-Host so Spring builds the OAuth redirect URL with :5173.
    proxy: Object.fromEntries(
      ['/api', '/oauth2', '/login', '/logout', '/v3/api-docs', '/swagger-ui'].map((path) => [
        path,
        { target: 'http://localhost:8080', xfwd: true },
      ]),
    ),
  },
})
