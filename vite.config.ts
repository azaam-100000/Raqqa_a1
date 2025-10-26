import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // FIX: Expose the VAPID public key to the frontend code.
      // Vercel uses PUBLIC_KEY, but the code expects NEXT_PUBLIC_VAPID_PUBLIC_KEY.
      // We read PUBLIC_KEY from Vercel's env and assign it to the name the app expects.
      'process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY': JSON.stringify(env.PUBLIC_KEY)
    }
  }
})