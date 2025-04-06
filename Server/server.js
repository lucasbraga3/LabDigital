const express = require('express');
const app = express();
const cors = require('cors');
const PORT = 3000;

app.use(cors());
app.use(express.static('public'));

app.listen(PORT, () => console.log(`Server listening on port: ${PORT}`));

//TODO: FILE UPLOADING RECIEVER