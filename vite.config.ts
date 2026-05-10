import { defineConfig } from 'vite'

export default defineConfig({
  root: './app',
  publicDir: false,
  build: {
    outDir: '../dist',
    emptyOutDir: true
  }
})
