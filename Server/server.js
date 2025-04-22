const express = require('express');
const app = express();
const cors = require('cors');
const PORT = 3000;
const fs = require('fs');
app.use(cors());
const path = require('path');
app.use(express.static('public'));
const multer = require('multer');
const { fromPath } = require('pdf2pic');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.listen(PORT, () => console.log(`Server listening on port: ${PORT}`));

app.post('/upload/target', upload.single('targets'), (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded.');
  
    const randomId = Math.floor(Math.random() * 1000000) + 1;
    const fileName = `${randomId}.mind`; // You can use .txt, .bin, or .mind
    const filePath = path.join(__dirname, 'public', fileName);
  
    fs.writeFile(filePath, req.file.buffer, err => {
      if (err) {
        console.error('Error saving file:', err);
        return res.status(500).send('Failed to save file.');
      }
      console.log(`File saved as ${fileName}`);
      res.status(200).send({ filename: fileName });
    });
  });

app.post('/upload/slides', upload.single('slides'), async (req, res) => {  
    if (!req.file) return res.status(400).send('No file uploaded.');
    // Ensure codetgt is available (modify according to your data source)
    if (!req.body.codetgt) {
      return res.status(400).send('Missing codetgt parameter');
    }

    const fileName =  `${req.body.codetgt}` + `.pdf`;
    const filePath = path.join(__dirname, 'public', fileName);
    fs.writeFile(filePath, req.file.buffer, err => {
      if (err) {
        console.error('Error saving file:', err);
        return res.status(500).send('Failed to save file.');
      }
    });

    const pdfPath = req.file.path;
    const outputDir = path.join(__dirname, 'public');
    const baseFileName = req.body.codetgt;

    // PDF conversion options
    const convertOptions = {
      density: 100,
      saveFilename: baseFileName, // Base name for output files
      savePath: outputDir,
      format: 'png',
      width: 800,
      height: 600,
      compression: 'jpeg',       // Optional compression
      quality: 90                // Image quality (1-100)
    };

    // Convert PDF to images
    const convert = fromPath(filePath, convertOptions);
    for(let i = 1; i<=req.body.numpags; i++){
      const images = await convert(i);
    }
    fs.rm(filePath, { recursive: true, force: true }, (err) => {
      if (err) console.error('Error deleting file:', err);
    } );
    let entitycode = '';
    let gencode = `
    <a-scene mindar-image="imageTargetSrc: http://localhost:3000/file250.mind; uiScanning:yes; autoStart: false;" color-space="sRGB" renderer="colorManagement: true" vr-mode-ui="enabled: false" device-orientation-permission-ui="enabled: false">
      <a-camera position="0 0 0" look-controls="enabled: false" cursor="fuse: false; rayOrigin: mouse;" raycaster="near: 10; far: 10000; objects: .clickable"></a-camera>
    `;
    gencode += `
    <a-assets>
    <img id="img1" src="http://localhost:3000/left-arrow.png" crossorigin="anonymous" />
    <img id="img2" src="http://localhost:3000/right-arrow.png" crossorigin="anonymous" />`;
    gencode += `\n<img id="example-image-1" src="http://localhost:3000/${req.body.codetgt}.1.png" crossorigin="anonymous" />`;
      entitycode += `
      <a-entity id="slide-1" class="slides">
        <a-image src="#example-image-1"></a-image>
        <a-image  class="clickable left-arrow" src="#img1" position="-0.7 0 0" height="0.15" width="0.15"></a-image>
        <a-image  class="clickable right-arrow" src="#img2" position="0.7 0 0" height="0.15" width="0.15"></a-image>
      </a-entity>`;
    for(let i = 2; i<=req.body.numpags; i++){
      gencode += `\n<img id="example-image-${i}" src="http://localhost:3000/${req.body.codetgt}.${i}.png" crossorigin="anonymous" />`;
      entitycode += `
      <a-entity id="slide-${i}" visible =false class="slides">
        <a-image src="#example-image-${i}"></a-image>
        <a-image  class="clickable left-arrow" src="#img1"  position="-0.7 0 0" height="0.15" width="0.15"></a-image>
        <a-image  class="clickable right-arrow" src="#img2" position="0.7 0 0" height="0.15" width="0.15"></a-image>
      </a-entity>`;
    }
    gencode += `\n</a-assets>
                  <a-entity id="slides-container" mindar-image-target="targetIndex: 0">`;
    gencode += entitycode;
    gencode += `\n</a-entity>
                </a-scene>`
    fs.writeFile(path.join(__dirname, 'public', `${req.body.codetgt}.html`), gencode, (err) => {
      if (err) {
        console.error('Error writing HTML file:', err);
        return res.status(500).send('Failed to write HTML file.');
      }
      console.log(`HTML file created: ${req.body.codetgt}.html`);
    } );
    res.json({
      success: true,
      message: 'PDF converted successfully',
    });
});    

//TODO: FILE UPLOADING RECIEVER