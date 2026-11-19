import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// In development, /api and /health are proxied to the local API, so no CORS setup is needed.
// In production, set VITE_API_URL to the API's public URL at build time.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
    },
  },
});
