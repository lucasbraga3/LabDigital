// Using Express to create a server that handles file uploads and PDF conversion
const express = require('express');
const app = express();


// Handling CORS issues
const cors = require('cors');
app.use(cors());
app.use(express.static('public')); // Serve static files from the 'public' directory
const PORT = 3000;                  // Port number for the server
const fs = require('fs');           // Using File System (fs) to handle file operations
const path = require('path');       // Get the current working directory

// Using Multer for handling multipart/form-data, which is used for uploading files
// Multer is a middleware for handling multipart/form-data, which is primarily used for uploading files
const multer = require('multer');
const storage = multer.memoryStorage();       // Store files in memory (buffer) instead of on disk
const upload = multer({ storage: storage });  // Create a multer instance with memory storage

// Using pdf2pic to convert PDF files to images
// pdf2pic is a library that converts PDF files to images (PNG, JPEG, etc.)
const { fromPath } = require('pdf2pic');

app.listen(PORT, () => console.log(`Server listening on port: ${PORT}`));

// Endpoint to handle file uploads for target files
// The target files are expected to be in .mind format
app.post('/upload/target', upload.single('targets'), (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded.');
  
    const randomId = Math.floor(Math.random() * 1000000) + 1;
    const fileName = `${randomId}.mind`; // You can use .txt, .bin, or .mind
    const filePath = path.join(__dirname, 'public', fileName);
  
    // Save the uploaded file to the server
    fs.writeFile(filePath, req.file.buffer, err => {
      if (err) {
        console.error('Error saving file:', err);
        return res.status(500).send('Failed to save file.');
      }
      console.log(`File saved as ${fileName}`);
      res.status(200).send({ filename: fileName });
    });
  });

// Endpoint to handle file uploads for slides (PDF files)
// The slides are expected to be in PDF format
// The PDF files are converted to images (PNG) and an HTML file is generated for A-Frame
app.post('/upload/slides', upload.single('slides'), async (req, res) => {  
    if (!req.file) return res.status(400).send('No file uploaded.');
    // Ensure codetgt is available (modify according to your data source)
    if (!req.body.codetgt) {
      return res.status(400).send('Missing codetgt parameter');
    }
    
    // Get the file name and path for the uploaded PDF file
    // The file name is generated based on the codetgt parameter (codetgt) provided by the user
    const fileName =  `${req.body.codetgt}` + `.pdf`;

    // Join the current directory with the public directory and the file name
    const filePath = path.join(__dirname, 'public', fileName);

    // Save the uploaded file to the server
    // The file is saved in the public directory with the name given by the user
    fs.writeFile(filePath, req.file.buffer, err => {
      if (err) {
        console.error('Error saving file:', err);
        return res.status(500).send('Failed to save file.');
      }
    });

    //const pdfPath = req.file.path;
    const outputDir = path.join(__dirname, 'public');
    const baseFileName = req.body.codetgt;

    // PDF conversion options
    const convertOptions = {
      density: 100,
      saveFilename: baseFileName, // Base name for output files
      savePath: outputDir,        // Output directory
      format: 'png',
      width: 800,
      height: 600,
      compression: 'jpeg',       // Optional compression
      quality: 90                // Image quality (1-100)
    };

    // Convert PDF to images
    const convert = fromPath(filePath, convertOptions);
    //Legacy code to convert all pages recieveing the number of pages from the client
    // for(let i = 1; i<=req.body.numpags; i++){
    //   const images = await convert(i);
    // }
    
    // Start converting pages one by one
    // and stop when an error occurs (e.g., no more pages)
    let page = 1;         // Start from the first page
    const maxPages = 200; // Set a maximum number of pages to avoid infinite loops
    while(page <= maxPages){
      // Convert the current page
      try
      {
        // Convert the current page and save it as a PNG file
        await convert(page);
        page++;
      }
      // If an error occurs, it usually means there are no more pages to convert or the page number is invalid
      // In this case, we can break the loop
      catch(err)
      {
        console.log(`🛑 Stopped at page ${page - 1}:`, err.message || err);
        break;
      }
    }

    // Delete the original PDF file after conversion
    fs.rm(filePath, { recursive: true, force: true }, (err) => {
      if (err) console.error('Error deleting file:', err);
    } );
    

    // Generate HTML code for the A-Frame scene
    // This code creates a scene with a camera and an image target
    let gencode = `
    <a-scene id="example-target" mindar-image="imageTargetSrc: http://localhost:3000/${req.body.codetgt}.mind; uiScanning:yes; autoStart: false;" color-space="sRGB" renderer="colorManagement: true" vr-mode-ui="enabled: false" device-orientation-permission-ui="enabled: false">
      <a-camera position="0 0 0" look-controls="enabled: false" cursor="fuse: false; rayOrigin: mouse;" raycaster="near: 10; far: 10000; objects: .clickable"></a-camera>
    `;

    // Add the arrows to the scene
    gencode += `
    <a-assets>
      <img id="img1" src="http://localhost:3000/left-arrow.png" crossorigin="anonymous" />
      <img id="img2" src="http://localhost:3000/right-arrow.png" crossorigin="anonymous" />`;

    // Get the first image and add it to the scene
    gencode += `\n<img id="example-image-1" src="http://localhost:3000/${req.body.codetgt}.1.png" crossorigin="anonymous" />`;

    // Create the entity code for the images
    // The entity code is a string that contains the HTML code for the images
    let entitycode = ``;

    // Add the first entity to the scene (the first image)
    entitycode += `
    <a-entity id="slide-1" class="slides">
      <a-image src="#example-image-1"></a-image>
      <a-image  class="clickable left-arrow" src="#img1" position="-0.7 0 0" height="0.15" width="0.15"></a-image>
      <a-image  class="clickable right-arrow" src="#img2" position="0.7 0 0" height="0.15" width="0.15"></a-image>
    </a-entity>`;
    
    // Add the rest of the images to the scene
    //for(let i = 2; i<=req.body.numpags; i++){
    for(let i = 2; i < page; i++)
    {
      // Get the image and add it to the scene
      gencode += `\n<img id="example-image-${i}" src="http://localhost:3000/${req.body.codetgt}.${i}.png" crossorigin="anonymous" />`;

      // Add the entity for the image to the scene
      // The entity is initially invisible and has the class "slides"
      entitycode += `
      <a-entity id="slide-${i}" visible=false class="slides">
        <a-image src="#example-image-${i}"></a-image>
        <a-image  class="clickable left-arrow" src="#img1"  position="-0.7 0 0" height="0.15" width="0.15"></a-image>
        <a-image  class="clickable right-arrow" src="#img2" position="0.7 0 0" height="0.15" width="0.15"></a-image>
      </a-entity>`;
    }
    
    // Finally, add the assets to the scene and close the scene tag
    gencode += `
      \n</a-assets>
      <a-entity id="slides-container" mindar-image-target="targetIndex: 0">`;

    // Insert the entity code into the scene
    gencode += entitycode;

    // Close the entity and scene tags
    gencode += `\n</a-entity></a-scene>`

    // Write the generated HTML code to a file
    // The file is saved in the public directory with the name given by the user
    // The file is saved as a .html file
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