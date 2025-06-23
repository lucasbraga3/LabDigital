# LabDigital – Plataforma Web de Realidade Aumentada Educacional

## Visão Geral

O **LabDigital** é uma plataforma web de Realidade Aumentada (RA) para ensino superior. Professores podem fazer upload de imagens ou PDFs de slides e associar conteúdos virtuais (modelos 3D, imagens interativas). Alunos, ao apontar seus dispositivos móveis para esses slides, visualizam objetos virtuais sobrepostos em tempo real, via navegador.

---

## Estrutura de Arquivos

```plaintext
LabDigital
│   .gitignore
│   LICENSE.md
│   README.md
│
├───Server
│   │   .env
│   │   package-lock.json
│   │   package.json
│   │   server.js
│   │
│   ├───certs
│   │       api.dev.local-key.pem
│   │       api.dev.local.pem
│   │       localhost-key.pem
│   │       localhost.pem
│   │
│   └───public
│           left-arrow.png
│           right-arrow.png
│
└───VanillaJs
  │   .env
  │   package-lock.json
  │   package.json
  │   vite.config.mjs
  │
  ├───certs
  │       localhost-key.pem
  │       localhost.pem
  │
  └───src
    │   dropbox.css
    │   index.html
    │
    ├───pages
    │       ar-main.html
    │       compiler.html
    │       slides.html
    │
    ├───public
    │       greentargets.mind
    │       redtargets.mind
    │
    ├───scripts
    │       ar-script.js
    │       compilescript.js
    │       detector.js
    │       dropbox-dist.js
    │       virtualcomp.mjs
    │
    └───styles
        ar-main-style.css
        compiler-style.css
        index-style.css
        slides-style.css
```

---

## Pré-requisitos

- Node.js (>=14) e npm ou yarn
- Docker (para Redis)
- mkcert instalado e CA confiável (`mkcert -install`)
- ngrok instalado

- Instale essas dependências no Linux antes de executar o npm install no cliente. (Testado no Ubuntu 24.04).

  ```bash
  sudo apt-get update
  sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev pkg-config
  ```

---

## Como Executar - Servidor

1. **Clone o repositório**

   ```bash
   git clone https://github.com/lucasbraga3/LabDigital.git -b back2httpwthhyperbeam
   cd LabDigital/Server
   ```

2. **Configurar variáveis de ambiente**

   ```bash
   # No Linux
   touch .env

   # No Windows
   ni .env 
   ```

   E adicione o conteúdo

    ```bash
    # .env
    HYPERBEAM_KEY=sk_test_<sua_key_do_hyperbeam>
    SERVER_IP=localhost
    SERVER_PORT=3000
    SSL_KEY_PATH=certs/localhost-key.pem
    SSL_CERT_PATH=certs/localhost.pem
    ```

3. **Inicie o Redis em Docker**

   ```bash
   docker run -d --name redis-labdigital -p 6379:6379 redis:7-alpine
   ```

4. **Instale dependências e execute o servidor**

   ```bash
   npm install
   node server.js    # ou npm run dev
   ```

   Servidor HTTPS em: [http://localhost:3000](http://localhost:3000)

---

## Como Executar - Cliente (Frontend)

1. **Instale dependências**

   ```bash
   cd ../VanillaJs
   npm install
   ```

2. **Gere certificados TLS para HTTPS local**

   ```bash
   mkdir -p certs
   mkcert -key-file certs/localhost-key.pem -cert-file certs/localhost.pem localhost
   ```

3. **Configure o Vite**
    - Verifique se `vite.config.mjs` aponta para `certs/localhost.pem` e `certs/localhost-key.pem`.

    - Exemplo de `vite.config.mjs`:

    ```bash
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
    ```

4. **Execute o dev-server**

   ```bash
   npm run dev
   ```

   Dev-server HTTPS em: [https://localhost:5173](https://localhost:5173)

5. **Exponha via ngrok**

   ```bash
   ngrok http https://localhost:5173
   ```

   Copie a URL `https://<seu-subdomínio>.ngrok.io` para acesso externo.

---

## Uso

- Acesse a URL do ngrok no navegador ou dispositivo móvel.
- Em **Compilar Alvo**, faça upload de imagens/PDFs para gerar markers `.mind`.
- Em **Gerenciar Conteúdo**, faça upload de slides ou modelos 3D.
- Em **Visualizador AR**, inicie a câmera para ver a RA em tempo real.

---

## Contribuição

Contribuições são bem-vindas! Abra issues, envie pull requests e siga o estilo do projeto.

---

## Licença

Este projeto é licenciado sob a MIT License. Consulte [LICENSE.md](LICENSE.md) para detalhes.
