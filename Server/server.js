// server.js - Versão final para Slides e Modelos 3D com Redis, HTTPS e Upload robusto

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { fromPath } = require('pdf2pic');
const { createClient } = require('redis');
const https = require('https');

const app = express();
const PORT = 3000;

// Middleware de CORS e JSON
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Redis Setup
const redis = createClient({ url: 'redis://127.0.0.1:6379' });
redis.on('error', (err) => console.error('Redis Client Error', err));
redis.connect().then(() => console.log('✅ Redis Connected')).catch(console.error);

// SSL setup (HTTPS)
const sslOptions = {
  key: fs.readFileSync('./localhost+2-key.pem'),
  cert: fs.readFileSync('./localhost+2.pem'),
};

// Storage para slides (.pdf, .pptx, .png, .jpg, .jpeg)
const slidesStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let codetgt = req.body.codetgt;
    if (Array.isArray(codetgt)) codetgt = codetgt[0];
    if (!codetgt) return cb(new Error('Missing codetgt'), null);
    const slidesDir = path.join(__dirname, 'public');
    fs.mkdirSync(slidesDir, { recursive: true });
    cb(null, slidesDir);
  },
  filename: (req, file, cb) => {
    let codetgt = req.body.codetgt;
    if (Array.isArray(codetgt)) codetgt = codetgt[0];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${codetgt}${ext}`);
  }
});
const uploadSlides = multer({ storage: slidesStorage });

// Storage para modelos 3D e assets
const assetsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let codetgt = req.body.codetgt;
    if (Array.isArray(codetgt)) codetgt = codetgt[0];
    if (!codetgt) return cb(new Error("Missing codetgt"));
    const modelDir = path.join(__dirname, 'public');
    fs.mkdirSync(modelDir, { recursive: true });
    cb(null, modelDir);
  },
  filename: (req, file, cb) => {
    const validExts = ['.gltf', '.glb', '.bin', '.png', '.jpg', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!validExts.includes(ext)) {
      return cb(new Error(`Extensão não suportada: ${ext}`));
    }
    cb(null, file.originalname); // mantém o nome original
  }
});
const uploadAssetsDisk = multer({ storage: assetsStorage });

// MemoryStorage para targets (arquivo .mind gerado)
const upload = multer({ storage: multer.memoryStorage() });

// HTTPS Setup
https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(`🔒 HTTPS Server rodando na porta ${PORT}`);
});

// --- ROUTES ---

// Upload de TARGET (.mind para AR)
app.post('/upload/target', upload.single('targets'), async (req, res) => {
  let codetgt = req.body.codetgt || Math.floor(Math.random() * 1000000) + 1;
  const key = `mind:${codetgt}`;
  const exists = await redis.exists(key);
  if (exists) return res.status(409).send('Target already exists.');
  try {
    await redis.set(key, req.file.buffer.toString('base64'), 'EX', 108000);
    return res.status(200).send({ fileName: `${codetgt}.mind`, codetgt });
  } catch (err) {
    console.error('Error saving target:', err);
    return res.status(500).send('Failed to save target file.');
  }
});

// Recupera o .mind da base Redis
app.get('/targets/:codetgt', async (req, res) => {
  const { codetgt } = req.params;
  try {
    const base64 = await redis.get(`mind:${codetgt}`);
    if (!base64) return res.status(404).send('Target file not found in Redis.');
    const buffer = Buffer.from(base64, 'base64');
    res.set('Content-Type', 'application/octet-stream');
    res.send(buffer);
  } catch (err) {
    console.error('Redis target fetch error:', err);
    res.status(500).send('Redis error');
  }
});

// Upload de slides (.pdf, .pptx, .png, .jpg, .jpeg)
app.post('/upload/slides', uploadSlides.single('slides'), async (req, res) => {
  try {
    let codetgt = req.body.codetgt;
    if (Array.isArray(codetgt)) codetgt = codetgt[0];
    const slidesDir = path.join(__dirname, 'public');
    const filePath = req.file.path;
    const ext = path.extname(filePath).toLowerCase();

    let pages = [];

    // Se for PDF, converte para imagens e salva cada página no Redis
    if (ext === '.pdf') {
      const convert = fromPath(filePath, {
        density: 150,
        saveFilename: codetgt,
        savePath: slidesDir,
        format: 'png',
        width: 1024,
        height: 768,
        quality: 90
      });

      for (let page = 1; page <= 200; page++) {
        try {
          const out = await convert(page);
          const imgPath = path.join(slidesDir, path.basename(out.path));
          const imageBuffer = fs.readFileSync(imgPath);
          await redis.set(`img:${codetgt}:${page}`, imageBuffer.toString('base64'), 'EX', 10800);
          pages.push(page);
          fs.unlinkSync(imgPath);
        } catch {
          break;
        }
      }
      fs.unlinkSync(filePath); // Remove PDF original
    } else {
      // PNG, JPG, PPTX etc: salva como uma página só (simples)
      const imageBuffer = fs.readFileSync(filePath);
      await redis.set(`img:${codetgt}:1`, imageBuffer.toString('base64'), 'EX', 10800);
      pages.push(1);
      fs.unlinkSync(filePath);
    }

    // Gera HTML AR para os slides enviados
    const gencode = generateMindARSlidesHtml({ codetgt, pages });
    const htmlBase64 = Buffer.from(gencode).toString('base64');
    await redis.set(`slides:${codetgt}`, htmlBase64, 'EX', 10800);
    res.status(200).json({ success: true, codetgt, images: pages, html: `/slides/${codetgt}/${codetgt}.html` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Servir HTML dos slides do Redis
app.get('/slides/:codetgt', async (req, res) => {
  const { codetgt } = req.params;
  try {
    const html = await redis.get(`slides:${codetgt}`);
    if (!html) return res.status(404).send('HTML not found in Redis.');
    res.set('Content-Type', 'text/html');
    res.send(Buffer.from(html, 'base64').toString('utf-8'));
  } catch (err) {
    console.error('Redis HTML fetch error:', err);
    res.status(500).send('Redis error');
  }
});

// Servir imagens individuais de slides
app.get('/img/:codetgt/:page', async (req, res) => {
  const key = `img:${req.params.codetgt}:${req.params.page}`;
  try {
    const base64 = await redis.get(key);
    if (!base64) return res.status(404).send('Image not found');
    const buffer = Buffer.from(base64, 'base64');
    res.set('Content-Type', 'image/png');
    res.send(buffer);
  } catch (err) {
    console.error('Redis error:', err);
    res.status(500).send('Redis error');
  }
});

// Upload de modelos 3D (GLTF/GLB, BIN, PNG, etc) e salva também no Redis
app.post('/upload/model', uploadAssetsDisk.array('files'), async (req, res) => {
  try {
    let codetgt = req.body.codetgt;
    if (Array.isArray(codetgt)) codetgt = codetgt[0];
    if (!codetgt) return res.status(400).json({ success: false, message: "Missing codetgt" });

    const modelsDir = path.join(__dirname, 'public');
    let mainModel = null;

    for (const file of req.files) {
      // Salva cada arquivo no Redis (key: modelasset:<codetgt>:<filename>)
      const buffer = fs.readFileSync(file.path);
      await redis.set(
        `modelasset:${codetgt}:${file.originalname}`,
        buffer.toString('base64'),
        'EX', 10800 // 3 horas
      );

      if (file.originalname.endsWith('.gltf') || file.originalname.endsWith('.glb')) {
        mainModel = file.originalname;
      }
      fs.unlinkSync(file.path)
    }

    if (!mainModel)
      return res.status(400).json({ success: false, message: "No .gltf or .glb model found." });

    // Ajuste de centralização/tamanho. Altere conforme o modelo for testado:
    const html = generateMindARGLTFModel({
      codetgt,
      modelFilename: mainModel,
      scale: "0.05 0.05 0.05",    // Diminui se estiver grande
      position: "0 -0.14 0",      // Move para baixo se estiver alto/descentralizado
      rotation: "0 0 0"           // Gire se necessário
    });
    const htmlBase64 = Buffer.from(html).toString('base64');
    await redis.set(`model:${codetgt}`, htmlBase64, 'EX', 10800);

    res.status(200).json({ success: true, codetgt, html: `/model/${codetgt}` });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// Servir HTML para modelo 3D do Redis
app.get('/model/:codetgt', async (req, res) => {
  const { codetgt } = req.params;
  try {
    const htmlBase64 = await redis.get(`model:${codetgt}`);
    if (!htmlBase64) return res.status(404).send('Model HTML not found');
    res.set('Content-Type', 'text/html');
    res.send(Buffer.from(htmlBase64, 'base64').toString('utf-8'));
  } catch (err) {
    console.error('Error serving model HTML:', err);
    res.status(500).send('Server error');
  }
});

app.get('/models/:codetgt/:filename', async (req, res) => {
  const { codetgt, filename } = req.params;
  try {
    const base64 = await redis.get(`modelasset:${codetgt}:${filename}`);
    if (!base64) return res.status(404).send('Arquivo não encontrado no Redis');
    const ext = path.extname(filename).toLowerCase();
    let mime = 'application/octet-stream';
    if (ext === '.gltf' || ext === '.glb') mime = 'model/gltf+json';
    if (ext === '.png') mime = 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
    if (ext === '.bin') mime = 'application/octet-stream';
    res.set('Content-Type', mime);
    res.send(Buffer.from(base64, 'base64'));
  } catch (err) {
    res.status(500).send('Erro ao buscar arquivo no Redis');
  }
});

// Middleware global de erro para uploads
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error("MULTER ERROR:", err);
    return res.status(400).send(`MulterError: ${err.message}`);
  }
  if (err) {
    console.error("UNEXPECTED ERROR:", err);
    return res.status(500).send("Erro interno no servidor.");
  }
  next();
});


// Funções utilitárias para gerar HTML AR
function generateMindARSlidesHtml({ codetgt, pages }) {
  const mindUrl = `https://localhost:${PORT}/targets/${codetgt}`;
  const arrowTags = [
    `<img id="img1" src="https://localhost:${PORT}/left-arrow.png" crossorigin="anonymous" />`,
    `<img id="img2" src="https://localhost:${PORT}/right-arrow.png" crossorigin="anonymous" />`
  ].join('\n    ');

  const assetTags = pages
    .map(i => `<img id="example-image-${i}" src="https://localhost:${PORT}/img/${codetgt}/${i}" crossorigin="anonymous" />`)
    .join('\n    ');

  const entityTags = pages.map((i, idx) => `
    <a-entity id="slide-${i}" class="slides" ${idx > 0 ? 'visible="false"' : 'visible="true"'}>
      <a-image src="#example-image-${i}"></a-image>
      <a-image class="clickable left-arrow"  src="#img1"  position="-0.7 0 0" height="0.15" width="0.15"></a-image>
      <a-image class="clickable right-arrow" src="#img2" position=" 0.7 0 0" height="0.15" width="0.15"></a-image>
    </a-entity>`).join('\n');

  return `
    <a-scene id="example-target" mindar-image="imageTargetSrc: ${mindUrl}; uiScanning: yes; autoStart: false;" color-space="sRGB" renderer="colorManagement: true" vr-mode-ui="enabled: false" device-orientation-permission-ui="enabled: false">
      <a-camera position="0 0 0" look-controls="enabled: false" cursor="fuse: false; rayOrigin: mouse;" raycaster="near: 10; far: 10000; objects: .clickable"></a-camera>
        <a-assets>
          ${arrowTags}
          ${assetTags}
        </a-assets>
      <a-entity id="slides-container" mindar-image-target="targetIndex: 0">
        ${entityTags}
      </a-entity>
    </a-scene>`;
}

function generateMindARGLTFModel({ codetgt, modelFilename = "model.gltf", scale = "0.5 0.5 0.5", position = "0 0 0", rotation = "0 0 0" }) {
  const mindUrl = `https://localhost:${PORT}/targets/${codetgt}`;
  const modelUrl = `https://localhost:${PORT}/models/${codetgt}/${modelFilename}`;

  return `
    <a-scene
      mindar-image="imageTargetSrc: ${mindUrl}; autoStart: true; uiScanning: yes;"
      color-space="sRGB"
      renderer="colorManagement: true"
      vr-mode-ui="enabled: false"
      device-orientation-permission-ui="enabled: false"
      embedded
    >
      <a-assets>
        <a-asset-item id="gltf-model" src="${modelUrl}"></a-asset-item>
      </a-assets>

      <a-camera
        position="0 0 0"
        look-controls="enabled: false"
        cursor="fuse: false; rayOrigin: mouse;"
        raycaster="near: 0.01; far: 10000; objects: .clickable"
      ></a-camera>

      <a-entity mindar-image-target="targetIndex: 0">
        <a-gltf-model
          src="#gltf-model"
          position="${position}"
          scale="${scale}"
          rotation="${rotation}"
        ></a-gltf-model>
      </a-entity>
    </a-scene>
  `;
}
