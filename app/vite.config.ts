import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base './' so the bundle works under a GitHub Pages project path
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
