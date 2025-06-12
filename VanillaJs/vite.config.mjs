import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import mkcert from 'vite-plugin-mkcert'
export default defineConfig({
  plugins: [
    tailwindcss(), //mkcert()
  ],
    root: 'src',
    publicDir: '../public',
    server: {
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp"
      }
    }
  });