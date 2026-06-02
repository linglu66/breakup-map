import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      {
        name: 'html-transform',
        transformIndexHtml(html) {
          return html.replace('{{GOOGLE_MAPS_API_KEY}}', env.VITE_GOOGLE_MAPS_API_KEY || '')
        }
      }
    ],
    build: {
      rollupOptions: {
        input: {
          main: './index.html'
        }
      }
    }
  }
})