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
    res.json({
      success: true,
      message: 'PDF converted successfully',
    });
});    

//TODO: FILE UPLOADING RECIEVER