import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { serverTimestamp } from 'firebase/firestore'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss(),
  ],

  server: {
    allowedHosts: ['*'], 
    host: true,
    strictPort:true
  }
})
