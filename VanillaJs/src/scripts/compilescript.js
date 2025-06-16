import "aframe";
import "mind-ar/dist/mindar-image-aframe.prod.js";
import axios from 'axios';

// Instancia o compilador do MindAR, que será usado pela função principal
const compiler = new MINDAR.IMAGE.Compiler();

// Função auxiliar para carregar um arquivo de imagem
const loadImage = async (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

// Função principal que orquestra todo o processo de compilação e upload
const compileFiles = async (files, codetgt = null) => {
  try {
    // ETAPA 1: Carregar a imagem
    window.updateCompilerProgress(10, 'Carregando imagem na memória...');
    const image = await loadImage(files[0]);

    // ETAPA 2: Compilar os alvos com feedback de progresso
    // O progresso da compilação (0-100) será mapeado para a faixa de 20% a 70% da barra total
    const dataList = await compiler.compileImageTargets([image], (progress) => {
      window.updateCompilerProgress(20 + progress * 0.5, 'Analisando e compilando features...');
    });

    // ETAPA 3: Gerar as imagens de resultado (em memória)
    window.updateCompilerProgress(75, 'Gerando pré-visualização dos resultados...');
    const results = [];
    dataList.forEach(data => {
      // Gera a imagem de tracking
      const trackingImage = data.trackingImageList[0];
      const trackingPoints = data.trackingData[0].points.map(p => ({ x: Math.round(p.x), y: Math.round(p.y) }));
      results.push({
        src: generateResultImage(trackingImage, trackingPoints),
        name: 'Tracking Points'
      });

      // Gera a imagem de matching
      const matchingImage = data.imageList[0];
      const matchingPoints = [...data.matchingData[0].maximaPoints, ...data.matchingData[0].minimaPoints].map(p => ({ x: Math.round(p.x), y: Math.round(p.y) }));
      results.push({
        src: generateResultImage(matchingImage, matchingPoints),
        name: 'Matching Points'
      });
    });

    // ETAPA 4: Exportar o buffer final do arquivo .mind
    window.updateCompilerProgress(85, 'Exportando arquivo .mind...');
    const exportedBuffer = await compiler.exportData();

    // ETAPA 5: Enviar o arquivo .mind para o servidor
    window.updateCompilerProgress(90, 'Enviando para o servidor...');
    const blob = new Blob([exportedBuffer]);
    const formData = new FormData();
    formData.append("targets", blob, `${codetgt}.mind`);
    formData.append("codetgt", codetgt);

    await axios.post("http://localhost:3000/upload/target", formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    // ETAPA FINAL: Sucesso!
    window.updateCompilerProgress(100, 'Finalizado!');
    window.displayCompilerResults(results);

  } catch (err) {
    // Em caso de qualquer erro no processo, chama a função de erro da UI
    console.error('Erro na compilação:', err);
    window.displayCompilerError(err);
  }
};

// Função interna para desenhar os pontos na imagem e retornar um DataURL
const generateResultImage = (targetImage, points) => {
  const canvas = document.createElement('canvas');
  canvas.width = targetImage.width;
  canvas.height = targetImage.height;
  const ctx = canvas.getContext('2d');
  
  // Desenha a imagem base em tons de cinza
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = new Uint32Array(imageData.data.buffer);
  const alpha = (0xff << 24);
  for (let c = 0; c < targetImage.width; c++) {
    for (let r = 0; r < targetImage.height; r++) {
      const pix = targetImage.data[r * targetImage.width + c];
      data[r * canvas.width + c] = alpha | (pix << 16) | (pix << 8) | pix;
    }
  }
  
  // Desenha os pontos de feature em verde
  const pointColor = (0xff << 24) | (0x00 << 16) | (0xff << 8) | 0x00; // Verde
  for (let i = 0; i < points.length; ++i) {
    const x = points[i].x;
    const y = points[i].y;
    if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
      const offset = (x + y * canvas.width);
      data[offset] = pointColor;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  
  return canvas.toDataURL(); // Retorna a imagem como string base64
};

// Disponibiliza a função principal para ser chamada pelo HTML
window.compileFiles = compileFiles;