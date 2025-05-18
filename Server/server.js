// server.js (Fixed version with Redis image storage and serving)
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

const slidesStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const codetgt = req.body.codetgt;
    if (!codetgt) return cb(new Error('Missing codetgt'), null);
    const slidesDir = path.join(__dirname, 'public');
    fs.mkdirSync(slidesDir, { recursive: true });
    cb(null, slidesDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${req.body.codetgt}.pdf`);
  }
});

const uploadSlides = multer({ storage: slidesStorage });
const upload = multer({ storage: multer.memoryStorage() });

// HTTPS Setup
https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(`🔒 HTTPS Server rodando na porta ${PORT}`);
});

//OLD SERVE STATIC
// app.post('/upload/target', upload.single('targets'), (req, res) => {
//   let codetgt = req.body.codetgt || Math.floor(Math.random() * 1000000) + 1;
//   const targetDir = path.join(__dirname, 'public', 'targets', String(codetgt));
//   if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

//   const fileName = `${codetgt}.mind`;
//   const filePath = path.join(targetDir, fileName);

//   if (fs.existsSync(filePath)) return res.status(409).send('File already exists.');

//   fs.writeFile(filePath, req.file.buffer, err => {
//     if (err) return res.status(500).send('Failed to save file.');
//     return res.status(200).send({ fileName, codetgt });
//   });
// });

app.post('/upload/target', upload.single('targets'), async (req, res) => {
  let codetgt = req.body.codetgt || Math.floor(Math.random() * 1000000) + 1;
  const key = `mind:${codetgt}`;
  const exists = await redis.exists(key);
  if (exists) {
    return res.status(409).send('Target already exists.');}
  try {
    
    await redis.set(key, req.file.buffer.toString('base64'), 'EX',  108000); // expires in 3h
    const fileName = `${codetgt}.mind`;
    return res.status(200).send({ fileName, codetgt });
  } catch (err) {
    console.error('Error saving target:', err);
    return res.status(500).send('Failed to save target file.');
  }
});

app.get('/targets/:codetgt', async (req, res) => { //get targets from redis
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

// app.get('/slides', (req, res) => { //show all codes OLD
//   const slidesRoot = path.join(__dirname, 'public', 'slides');
//   try {
//     const codes = fs.readdirSync(slidesRoot, { withFileTypes: true })
//       .filter(d => d.isDirectory())
//       .map(d => d.name)
//       .filter(code => fs.existsSync(path.join(slidesRoot, code, `${code}.html`)));
//     return res.json({ codes });
//   } catch (err) {
//     return res.status(500).json({ error: 'Failed to list slides' });
//   }
// });

// app.get('/slides/:codetgt', (req, res) => { //OLD serve static
//   const codetgt = req.params.codetgt;
//   if (!/^[a-zA-Z0-9_-]{1,20}$/.test(codetgt)) return res.status(400).send('Invalid codetgt');

//   const htmlPath = path.join(__dirname, 'public', 'slides', codetgt, `${codetgt}.html`);
//   if (!fs.existsSync(htmlPath)) return res.status(404).send('Slide not found');

//   return res.sendFile(htmlPath);
// });

// Serve image from Redis
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

app.post('/upload/slides', uploadSlides.single('slides'), async (req, res) => {
  try {
    const codetgt = req.body.codetgt;
    const slidesDir = path.join(__dirname, 'public');
    const pdfPath = req.file.path;

    const convert = fromPath(pdfPath, {
      density: 150,
      saveFilename: codetgt,
      savePath: slidesDir,
      format: 'png',
      width: 1024,
      height: 768,
      quality: 90
    });

    const convertedImages = [];
    for (let page = 1; page <= 200; page++) { // Limit to 200 pages
      try {
        const out = await convert(page);
        const imgPath = path.join(slidesDir, path.basename(out.path));
        const imageBuffer = fs.readFileSync(imgPath);
        await redis.set(`img:${codetgt}:${page}`, imageBuffer.toString('base64'), 'EX', 10800);
        convertedImages.push(page);
        fs.unlinkSync(imgPath);
      } catch {
        break;
      }
    }

    fs.unlinkSync(pdfPath);
    const gencode = generateMindARSlidesHtml({ codetgt, pages: convertedImages });
    const htmlBase64 = Buffer.from(gencode).toString('base64');
    await redis.set(`slides:${codetgt}`,htmlBase64, 'EX', 10800); // Cache HTML in Redis
    res.status(200).json({ success: true, codetgt, images: convertedImages, html: `/slides/${codetgt}/${codetgt}.html` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/slides/:codetgt', async (req, res) => { // Serve HTML from Redis
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

function generateMindARGLTFModel({codetgt,pages}){
  const mindUrl = `https://localhost:${PORT}/targets/${codetgt}`;
}