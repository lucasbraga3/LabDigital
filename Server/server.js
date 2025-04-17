const express = require('express');
const app = express();
const cors = require('cors');
const PORT = 3000;
const fs = require('fs');
app.use(cors());
const path = require('path');
app.use(express.static('public'));
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.listen(PORT, () => console.log(`Server listening on port: ${PORT}`));

app.post('/upload', upload.single('targets'), (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded.');
  
    const randomId = Math.floor(Math.random() * 1000) + 1;
    const fileName = `file${randomId}.mind`; // You can use .txt, .bin, or .mind
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
//TODO: FILE UPLOADING RECIEVER