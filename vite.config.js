import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config for Blood Bond SPA
// - Reads API base URL from VITE_API_BASE_URL (with sensible default)
// - SPA fallback: every unknown path falls back to /index.html so Vercel
//   can serve the React Router routes without 404 on refresh.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'https://blood-bond.runasp.net',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
