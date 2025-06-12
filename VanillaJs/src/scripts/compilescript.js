import "aframe";
import "mind-ar/dist/mindar-image-aframe.prod.js";
import axios from 'axios';

Dropzone.autoDiscover = false;

// Instancia o compilador do MindAR
const compiler = new MINDAR.IMAGE.Compiler();

// Função para download do .mind (opcional)
const download = (buffer) => {
  const blob = new Blob([buffer]);
  const aLink = window.document.createElement('a');
  aLink.download = 'targets.mind';
  aLink.href = window.URL.createObjectURL(blob);
  aLink.click();
  window.URL.revokeObjectURL(aLink.href);
};

// Envia o arquivo .mind para o servidor via /upload/target
const send = async (buffer, codetgt = null) => {
  const msgDiv = document.getElementById("msg");
  try {
    const blob = new Blob([buffer]);
    const formData = new FormData();
    formData.append("targets", blob, codetgt ? `${codetgt}.mind` : "targets.mind");
    if (codetgt) formData.append("codetgt", codetgt);

    const response = await axios.post("http://localhost:3000/upload/target", formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    if (response.status === 200) {
      const fileName = response.data.fileName;
      msgDiv.textContent = 'Arquivo salvo: ' + fileName;
      msgDiv.className = "msg-success";
      // download(buffer); // Descomente para baixar local após upload
    } else if (response.status === 400) {
      msgDiv.textContent = 'Arquivo já existe. Escolha outro código.';
      msgDiv.className = "msg-err";
    }
  } catch (err) {
    msgDiv.textContent = "Erro ao enviar arquivo .mind";
    msgDiv.className = "msg-err";
    console.error("Erro ao enviar:", err);
  }
};

// Mostra visualização dos pontos/targets
const showData = (data) => {
  for (let i = 0; i < data.trackingImageList.length; i++) {
    const image = data.trackingImageList[i];
    const points = data.trackingData[i].points.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }));
    showImage(image, points);
  }
  for (let i = 0; i < data.imageList.length; i++) {
    const image = data.imageList[i];
    const kpmPoints = [...data.matchingData[i].maximaPoints, ...data.matchingData[i].minimaPoints];
    const points2 = [];
    for (let j = 0; j < kpmPoints.length; j++) {
      points2.push({ x: Math.round(kpmPoints[j].x), y: Math.round(kpmPoints[j].y) });
    }
    showImage(image, points2);
  }
};

const showImage = (targetImage, points) => {
  const container = document.getElementById("container");
  if (!container) return;
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
  var pix = (0xff << 24) | (0x00 << 16) | (0xff << 8) | 0x00; // verde
  for (let i = 0; i < points.length; ++i) {
    const x = points[i].x;
    const y = points[i].y;
    const offset = (x + y * canvas.width);
    data[offset] = pix;
    for (var size = 1; size <= 6; size++) {
      data[offset - size] = pix;
      data[offset + size] = pix;
      data[offset - size * canvas.width] = pix;
      data[offset + size * canvas.width] = pix;
    }
  }
  ctx.putImageData(imageData, 0, 0);
};

const loadImage = async (file) => {
  return new Promise((resolve, reject) => {
    let img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

const compileFiles = async (files, codetgt = null) => {
  const progressEl = document.getElementById("progress");
  const msgDiv = document.getElementById("msg");
  if (progressEl) progressEl.innerText = "";
  if (msgDiv) msgDiv.textContent = "";

  try {
    // Limpa container visual
    const container = document.getElementById("container");
    if (container) container.innerHTML = "";

    // 1) Carrega imagens
    const images = [];
    for (const file of files) {
      images.push(await loadImage(file));
    }

    // 2) Compila com progresso
    const dataList = await compiler.compileImageTargets(images, progress => {
      if (progressEl) progressEl.innerText = `Progresso: ${progress.toFixed(2)}%`;
    });
    if (progressEl) progressEl.innerText = "";

    // 3) Mostra debug das imagens
    dataList.forEach(showData);

    // 4) Exporta buffer .mind
    const exportedBuffer = await compiler.exportData();

    // 5) Envia para o servidor, passando codetgt
    await send(exportedBuffer, codetgt);

  } catch (err) {
    if (msgDiv) {
      msgDiv.textContent = 'Erro ao compilar imagens.';
      msgDiv.className = "msg-err";
    }
    console.error('Erro na compilação:', err);
  }
};

// Disponibiliza para o HTML
window.compileFiles = compileFiles;

// Suporte para abrir arquivo .mind (visualização)
const loadMindFile = async (file) => {
  var reader = new FileReader();
  reader.onload = function() {
    const dataList = compiler.importData(this.result);
    for (let i = 0; i < dataList.length; i++) {
      showData(dataList[i]);
    }
  };
  reader.readAsArrayBuffer(file);
};

// Instancia apenas UM Dropzone, protegido por DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
  // Instancia Dropzone sempre explicitamente aqui, sem if
  const dropzone = new Dropzone("#dropzone", {
    url: "#",
    autoProcessQueue: false,
    maxFiles: 1,
    acceptedFiles: ".png,.jpg,.jpeg",
    addRemoveLinks: true,
    clickable: true
  });

  document.getElementById("startButton").addEventListener("click", function() {
    const codetgt = document.getElementById("codetgt").value.trim();
    if (dropzone.files.length === 0) {
      const msgDiv = document.getElementById("msg");
      if (msgDiv) {
        msgDiv.textContent = "Adicione uma imagem para converter.";
        msgDiv.className = "msg-err";
      }
      return;
    }
    const ext = dropzone.files[0].name.split('.').pop().toLowerCase();
    if (ext === 'mind') {
      loadMindFile(dropzone.files[0]);
    } else {
      compileFiles(dropzone.files, codetgt);
    }
  });
});
