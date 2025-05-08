// server.js (Fixed version with Redis image storage and serving)
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { fromPath } = require('pdf2pic');
const { createClient } = require('redis');

const app = express();
const PORT = 3000;

const redis = createClient({ url: 'redis://localhost:6379' });
redis.connect().then(() => console.log('✅ Connected to Redis')).catch(console.error);

app.use(cors());
app.use(express.static('public'));

const slidesStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const codetgt = req.body.codetgt;
    if (!codetgt) return cb(new Error('Missing codetgt'), null);
    const slidesDir = path.join(__dirname, 'public', 'slides', codetgt);
    fs.mkdirSync(slidesDir, { recursive: true });
    cb(null, slidesDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${req.body.codetgt}.pdf`);
  }
});

const uploadSlides = multer({ storage: slidesStorage });
const upload = multer({ storage: multer.memoryStorage() });

app.listen(PORT, () => console.log(`Server listening on port: ${PORT}`));

app.post('/upload/target', upload.single('targets'), (req, res) => {
  let codetgt = req.body.codetgt || Math.floor(Math.random() * 1000000) + 1;
  const targetDir = path.join(__dirname, 'public', 'targets', String(codetgt));
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  const fileName = `${codetgt}.mind`;
  const filePath = path.join(targetDir, fileName);

  if (fs.existsSync(filePath)) return res.status(409).send('File already exists.');

  fs.writeFile(filePath, req.file.buffer, err => {
    if (err) return res.status(500).send('Failed to save file.');
    return res.status(200).send({ fileName, codetgt });
  });
});

app.get('/slides', (req, res) => { //show all codes
  const slidesRoot = path.join(__dirname, 'public', 'slides');
  try {
    const codes = fs.readdirSync(slidesRoot, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .filter(code => fs.existsSync(path.join(slidesRoot, code, `${code}.html`)));
    return res.json({ codes });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to list slides' });
  }
});

app.get('/slides/:codetgt', (req, res) => { //serve static
  const codetgt = req.params.codetgt;
  if (!/^[a-zA-Z0-9_-]{1,20}$/.test(codetgt)) return res.status(400).send('Invalid codetgt');

  const htmlPath = path.join(__dirname, 'public', 'slides', codetgt, `${codetgt}.html`);
  if (!fs.existsSync(htmlPath)) return res.status(404).send('Slide not found');

  return res.sendFile(htmlPath);
});

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
    const slidesDir = path.join(__dirname, 'public', 'slides', codetgt);
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
    for (let page = 1; page <= 200; page++) {
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

    const htmlPath = path.join(slidesDir, `${codetgt}.html`);
    const gencode = generateMindARHtml({ codetgt, pages: convertedImages });
    fs.writeFileSync(htmlPath, gencode, 'utf8');

    res.status(200).json({ success: true, codetgt, images: convertedImages, html: `/slides/${codetgt}/${codetgt}.html` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

function generateMindARHtml({ codetgt, pages }) {
  const mindUrl = `http://localhost:${PORT}/targets/${codetgt}/${codetgt}.mind`;
  const arrowTags = [
    `<img id="img1" src="http://localhost:3000/left-arrow.png" crossorigin="anonymous" />`,
    `<img id="img2" src="http://localhost:3000/right-arrow.png" crossorigin="anonymous" />`
  ].join('\n    ');

  const assetTags = pages
    .map(i => `<img id="example-image-${i}" src="http://localhost:3000/img/${codetgt}/${i}" crossorigin="anonymous" />`)
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