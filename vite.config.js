import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  // IMPORTANT: Change 'f1-dashboard' to match your GitHub repo name
  base: '/f1-dashboard/',
  // The SSR build (src/prerender.jsx, for scripts/prerender.mjs) needs no copy of public/
  build: { copyPublicDir: !isSsrBuild },
}))
