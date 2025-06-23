import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  envDir: __dirname,
  root: 'src',
  publicDir: '../public',
  plugins: [ tailwindcss() ],
  server: {
    https: {
      key: './certs/localhost-key.pem',
      cert: './certs/localhost.pem',
    },      // front e proxy rodam em HTTPS
    host: '0.0.0.0',      // expõe em todas as interfaces
    hmr: {
      protocol: 'wss',    // WebSocket seguro pro HMR
      // não defina `port` — o cliente usará o port 443 do túnel
      // não defina `host` aqui, ngrok injeta a URL correta
    },
    proxy: {
      '/api': {
        target: 'https://localhost:3000', // Altere para o IP do seu servidor se necessário
        changeOrigin: true,
        secure: false, // Se o servidor não usa HTTPS, mantenha como false
      },
      // adicione outras rotas de API se precisar
    },
    allowedHosts: true,
    headers: {
      "Cross-Origin-Opener-Policy":   "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp"
    }
  }
})
