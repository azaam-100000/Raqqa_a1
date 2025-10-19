import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // تحميل متغيرات البيئة من ملف .env
  // FIX: Replaced process.cwd() with '.' to resolve TypeScript error: Property 'cwd' does not exist on type 'Process'.
  const env = loadEnv(mode, '.', '')
  return {
    plugins: [react()],
    define: {
      // هذا السطر يقوم بتعريف متغير البيئة بشكل آمن للتطبيق
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  }
})
