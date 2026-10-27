import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The editor shares the hymn types and text format with the app (../src/data).
export default defineConfig({
  plugins: [react()],
  server: { fs: { allow: ['..'] } },
});
