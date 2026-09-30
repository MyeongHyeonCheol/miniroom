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
  },
})
