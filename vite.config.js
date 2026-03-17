import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // IMPORTANT: Change 'f1-dashboard' to match your GitHub repo name
  base: '/f1-dashboard/',
})
