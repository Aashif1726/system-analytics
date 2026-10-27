import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `npm run build` writes into the Spring Boot static folder so one jar serves UI + API.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../backend/src/main/resources/static',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: { '/api': process.env.API_URL || 'http://localhost:8090' },
  },
});
