import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

// Tauri expects a fixed dev port and a clear failure when it is taken.
export default defineConfig({
  plugins: [svelte()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    fs: {
      // compose.yml lives at the workspace root, one level above the app.
      allow: ['../../..'],
    },
    watch: {
      // Rust writes PDB/lock files while cargo builds; watching target triggers EBUSY.
      ignored: ['**/src-tauri/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: 'es2022',
    sourcemap: true,
  },
})
