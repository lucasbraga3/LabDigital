const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');
const multer  = require('multer');
const { fromPath } = require('pdf2pic');
const app = express();                  // Create an instance of Express
const PORT = 3000;                      // Port number for the server

app.use(cors());                        // Enable CORS for all routes
app.use(express.static('public'));      // Serve static files from the 'public' directory

// Using Multer for handling multipart/form-data, which is used for uploading files
// Multer is a middleware for handling multipart/form-data, which is primarily used for uploading files
// --- Multer Storage Dinâmico ---
const slidesStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const codetgt = req.body.codetgt;
    if (!codetgt) return cb(new Error('Missing codetgt'), null);
    const slidesDir = path.join(__dirname, 'public', 'slides', codetgt);
    fs.mkdirSync(slidesDir, { recursive: true });
    cb(null, slidesDir);
  },
  filename: (req, file, cb) => {
    // salva sempre como <codetgt>.pdf
    cb(null, `${req.body.codetgt}.pdf`);
  }
});
const uploadSlides = multer({ storage: slidesStorage });
const upload = multer({ storage: multer.memoryStorage() });

app.listen(PORT, () => console.log(`Server listening on port: ${PORT}`));

app.post('/upload/target', upload.single('targets'), (req, res) => {
  
  // Log the request body and file information for debugging
  console.log('Request body on /upload/target:', req.body);
  console.log('File information:', req.file);

  // Check if a file was uploaded
  if (!req.file) return res.status(400).send('No file uploaded.');

  // const randomId = Math.floor(Math.random() * 1000000) + 1;
  // const fileName = `${randomId}.mind`; // You can use .txt, .bin, or .mind
  // const filePath = path.join(__dirname, 'public', fileName);

  // Verify if codetgt is available, if not, generate a random ID
  let codetgt = req.body.codetgt;
  if (!codetgt) codetgt = Math.floor(Math.random()*1000000)+1;

  // Target directory for the uploaded target file
  const targetDir = path.join(__dirname, 'public', 'targets', String(codetgt));
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Get the file name and path for the uploaded target file
  const fileName = `${codetgt}.mind`; // Use the codetgt parameter from the request body
  const filePath = path.join(targetDir, fileName);

  if (!fileName) {
    return res.status(400).send('Invalid file name.');
  }

  if (fs.existsSync(filePath)) {
    return res.status(409).send('File already exists.');
  }

  // Save the uploaded file to the server
  fs.writeFile(filePath, req.file.buffer, err => {
    if (err) {
      console.error('Error saving file:', err);
      return res.status(500).send('Failed to save file.');
    }
    console.log(`File saved as ${fileName}`);
    return res.status(200).send({ fileName, codetgt });
  });
});

// 1) GET /slides
//    Retorna um JSON com todos os arquivos <codetgt>.html disponíveis em public/slides/<codetgt>/<codetgt>.html
app.get('/slides', (req, res) => {
  const slidesRoot = path.join(__dirname, 'public', 'slides');
  try {
    const codes = fs.readdirSync(slidesRoot, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .filter(code => {
        const htmlPath = path.join(slidesRoot, code, `${code}.html`);
        return fs.existsSync(htmlPath);
      });
      console.log('Slides found:', codes);
    return res.json({ codes });
  } catch (err) {
    console.error('Erro ao listar slides:', err);
    return res.status(500).json({ error: 'Failed to list slides' });
  }
});

// 2) GET /slides/:file - Return the HTML file for the specified slide
app.get('/slides/:codetgt', (req, res) => {
  // Log the request body and file information for debugging
  console.log('Request body on /slides/:codetgt:', req.body);
  console.log('File information:', req.file);

  const codetgt = req.params.codetgt;

  // 2.1) Validação básica do parâmetro
  if (!/^[a-zA-Z0-9_-]{1,20}$/.test(codetgt)) {
    return res.status(400).send('Invalid codetgt');
  }

  // 2.2) Monta o caminho do arquivo
  const htmlPath = path.join(__dirname, 'public', 'slides', codetgt, `${codetgt}.html`);
  if (!fs.existsSync(htmlPath)) {
    return res.status(404).send('Slide not found');
  }

  // 2.3) Envia o HTML
  return res.sendFile(htmlPath);
});

// Endpoint to handle file uploads for slides (PDF files)
// The slides are expected to be in PDF format
// The PDF files are converted to images (PNG) and an HTML file is generated for A-Frame
app.post('/upload/slides', uploadSlides.single('slides'), async (req, res) => 
{  
  // Log the request body and file information for debugging
  console.log('Request body on /upload/slides:', req.body);
  console.log('File information:', req.file);

  try {
    console.log('Request body on /upload/slides:', req.body);
    console.log('Saved PDF path:', req.file.path);

    const codetgt   = req.body.codetgt;
    const slidesDir = path.join(__dirname, 'public', 'slides', codetgt);
    const pdfPath   = req.file.path;

    // 1) Converter PDF → PNG em slidesDir
    const convert = fromPath(pdfPath, {
      density:    150,
      saveFilename: codetgt,    // gera codetgt.1.png, codetgt.2.png, ...
      savePath:     slidesDir,
      format:       'png',
      width:        1024,
      height:       768,
      quality:      90
    });

    const convertedImages = [];
    for (let page = 1; page <= 200; page++) {
      try {
        const out = await convert(page);
        convertedImages.push(path.basename(out.path));
      } catch {
        break; // termina ao não achar mais páginas
      }
    }
    console.log(`PDF convertido: ${convertedImages.length} páginas.`);

    // 2) Remove o PDF original
    fs.unlinkSync(pdfPath);

    // 3) Gera o HTML da cena e salva em slidesDir/<codetgt>.html
    //    (você pode montar o gencode aqui como antes, mas omitido por brevidade)
    const htmlPath = path.join(slidesDir, `${codetgt}.html`);
    const gencode = generateMindARHtml({ codetgt, images: convertedImages }); 
    fs.writeFileSync(htmlPath, gencode, 'utf8');
    console.log(`HTML salvo em: ${htmlPath}`);

    // 4) Retorna JSON com o codetgt, lista de imagens e rota do HTML
    res.status(200).json({
      success: true,
      codetgt,
      images: convertedImages,
      html: `/slides/${codetgt}/${codetgt}.html`
    });
  } catch (err) {
    console.error('Error in /upload/slides:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});  

function generateMindARHtml({ codetgt, images }) {
  const mindUrl    = `http://localhost:${PORT}/targets/${codetgt}/${codetgt}.mind`;
  const arrowTags  = [
    `<img id="img1" src="http://localhost:3000/left-arrow.png" crossorigin="anonymous" />`,
    `<img id="img2" src="http://localhost:3000/right-arrow.png" crossorigin="anonymous" />`
  ].join('\n    ');
  const assetTags  = images
    .map((img, i) => `<img id="example-image-${i}" src="http://localhost:3000/slides/${codetgt}/${img}" crossorigin="anonymous" />`)
    .join('\n    ');
  const entityTags = images
    .map((_, i) => `
    <a-entity id="slide-${i}" class="slides" ${i>0?`visible="false"`:'visible="true"'}">
      <a-image src="#example-image-${i}"></a-image>
      <a-image class="clickable left-arrow"  src="#img1"  position="-0.7 0 0" height="0.15" width="0.15"></a-image>
      <a-image class="clickable right-arrow" src="#img2" position=" 0.7 0 0" height="0.15" width="0.15"></a-image>
    </a-entity>`).join('');

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
    </a-scene>
`;
}
//TODO: FILE UPLOADING RECIEVER