import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// Builds into ../story so the main site can link to ./story/ (relative base works on github.io/<repo>/).
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: '../story', emptyOutDir: true, chunkSizeWarningLimit: 4000 },
});
