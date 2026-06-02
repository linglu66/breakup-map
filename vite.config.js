import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    {
      name: 'html-transform',
      transformIndexHtml(html) {
        return html.replace('{{GOOGLE_MAPS_API_KEY}}', process.env.VITE_GOOGLE_MAPS_API_KEY || '')
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
})