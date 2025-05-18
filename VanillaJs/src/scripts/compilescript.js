// import '../node_modules/aframe/dist/aframe-v1.7.0.js';
// import "../node_modules/mind-ar/dist/mindar-image-aframe.prod.js";

import "aframe";
import "mind-ar/dist/mindar-image-aframe.prod.js";
import axios from 'axios';

Dropzone.autoDiscover = false;
//document.getElementById('mindar-module').onload=()=>{
const compiler = new MINDAR.IMAGE.Compiler();

const download = (buffer) => {
  var blob = new Blob([buffer]);
  var aLink = window.document.createElement('a');
  aLink.download = 'targets.mind';
  aLink.href = window.URL.createObjectURL(blob);
  aLink.click();
  window.URL.revokeObjectURL(aLink.href);
}

const send = async (buffer, codetgt = null) => {
  console.log("sending...");
  try {
    const blob = new Blob([buffer]);
    const formData = new FormData();

    // Nome de arquivo (opcional e simbólico, o real é definido no backend)
    formData.append("targets", blob, codetgt ? `${codetgt}.mind` : "targets.mind");

    // Envia codetgt se tiver
    if (codetgt) {
      formData.append("codetgt", codetgt);
    }

    const response = await axios.post("https://localhost:3000/upload/target", formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    console.log("response", response);

    if (response.status === 200) {
      const fileName = response.data.fileName;
      console.log('✅ File saved as:', fileName);
      alert('✅ File saved as: ' + fileName);
    } else if (response.status === 400) {
      console.error('⚠️ Error: File already exists.');
      alert('⚠️ File already exists. Please choose a different code.');
    }

  } catch (err) {
    console.error("❌ Error sending file:", err);
    alert("❌ Failed to send .mind file");
  }
};

const showData = (data) => {
  console.log("data", data);
  for (let i = 0; i < data.trackingImageList.length; i++) {
    const image = data.trackingImageList[i];
const points = data.trackingData[i].points.map((p) => {
  return {x: Math.round(p.x), y: Math.round(p.y)};
});
    showImage(image, points);
  }

  for (let i = 0; i < data.imageList.length; i++) {
    const image = data.imageList[i];
    const kpmPoints = [...data.matchingData[i].maximaPoints, ...data.matchingData[i].minimaPoints];
    const points2 = [];
    for (let j = 0; j < kpmPoints.length; j++) {
      points2.push({x: Math.round(kpmPoints[j].x), y: Math.round(kpmPoints[j].y)});
    }
    showImage(image, points2);
  }
}


const showImage = (targetImage, points) => {
  const container = document.getElementById("container");
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);
  canvas.width  = targetImage.width;
  canvas.height = targetImage.height;
  canvas.style.width = canvas.width;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = new Uint32Array(imageData.data.buffer);

  const alpha = (0xff << 24);
  for (let c = 0; c < targetImage.width; c++) {
    for (let r = 0; r < targetImage.height; r++) {
      const pix = targetImage.data[r * targetImage.width + c];
      data[r * canvas.width + c] = alpha | (pix << 16) | (pix << 8) | pix;
    }
  }

  var pix = (0xff << 24) | (0x00 << 16) | (0xff << 8) | 0x00; // green
  for (let i=0; i < points.length; ++i) {
    const x = points[i].x;
    const y = points[i].y;
    const offset = (x + y * canvas.width);
    data[offset] = pix;
    //for (var size = 1; size <= 3; size++) {
    for (var size = 1; size <= 6; size++) {
      data[offset-size] = pix;
      data[offset+size] = pix;
      data[offset-size*canvas.width] = pix;
      data[offset+size*canvas.width] = pix;
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

const loadImage = async (file) => {
  const img = new Image();

  return new Promise((resolve, reject) => {
    let img = new Image()
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
    //img.src = src
  })
}

const compileFiles = async (files, codetgt = null) => {
  try {
    // 1) Carrega imagens
    const images = [];
    for (const file of files) {
      images.push(await loadImage(file));
    }

    // 2) Compila com progresso
    const start = performance.now();
    const dataList = await compiler.compileImageTargets(images, progress => {
      document.getElementById("progress").innerText = `progress: ${progress.toFixed(2)}%`;
    });
    console.log('⏱️ exec time compile:', performance.now() - start, 'ms');

    // 3) Mostra debug das imagens
    dataList.forEach(showData);

    // 4) Exporta buffer .mind
    const exportedBuffer = await compiler.exportData();

    // 5) Envia para o servidor, passando codetgt (se existir)
    await send(exportedBuffer, codetgt);

  } catch (err) {
    console.error('❌ Error in compileFiles:', err);
    alert('Erro ao compilar imagens.');
  }
};

// Torna a função global para uso no HTML
window.compileFiles = compileFiles;

const loadMindFile = async (file) => {
  var reader = new FileReader();
  reader.onload = function() {
    const dataList = compiler.importData(this.result);
    for (let i = 0; i < dataList.length; i++) {
      showData(dataList[i]);
    }
  }
  reader.readAsArrayBuffer(file);
}

document.addEventListener('DOMContentLoaded', function(event) {
  const myDropzone = new Dropzone("#dropzone", { url: "#", autoProcessQueue: false, addRemoveLinks: true });
  myDropzone.on("addedfile", function(file) {});

  document.getElementById("startButton").addEventListener("click", function() {
    const files = myDropzone.files;
    if (files.length === 0) return;
    const ext = files[0].name.split('.').pop();
    if (ext === 'mind') {
      loadMindFile(files[0]); 
    } else {
      compileFiles(files);
    }
  });
});
