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
      // This now checks for multiple common names for the VAPID key to be more robust.
      'process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY': JSON.stringify(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || env.VAPID_PUBLIC_KEY || env.PUBLIC_KEY)
    }
  }
})