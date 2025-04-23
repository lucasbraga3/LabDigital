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

const send = async (buffer) => {
    console.log("sending...");
    try{
          var blob = new Blob([buffer]);
          const formData = new FormData();
          formData.append("targets",blob,"targets.mind");
          const response = await axios.post("http://localhost:3000/upload/target",  formData, {
                headers: {
                  'Content-Type': 'multipart/form-data'
                }
              }); //response = nome/codigo do arquivo
            }
      catch(err){
          console.log("I tried..");
      }
}

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

const compileFiles = async (files) => {
  const images = [];
  for (let i = 0; i < files.length; i++) {
    images.push(await loadImage(files[i]));
  }
  let _start = new Date().getTime();
const dataList = await compiler.compileImageTargets(images, (progress) => {
document.getElementById("progress").innerHTML = 'progress: ' + progress.toFixed(2) + "%";
});
  console.log('exec time compile: ', new Date().getTime() - _start);
  for (let i = 0; i < dataList.length; i++) {
    showData(dataList[i]);
  }
  const exportedBuffer = await compiler.exportData();
  send(exportedBuffer);
  // document.getElementById("downloadButton").addEventListener("click", function() {
  //   send(exportedBuffer);
  //   download(exportedBuffer);
  // });
}

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
