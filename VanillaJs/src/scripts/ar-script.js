import "aframe";
import "mind-ar/dist/mindar-image-aframe.prod.js";

export function initARControls() {
  const sceneEl = document.querySelector("a-scene");
  if (!sceneEl) {
    console.error("Nenhum <a-scene> encontrado no DOM!");
    return;
  }

  let arSystem;
  sceneEl.addEventListener("loaded", function () {
    arSystem = sceneEl.systems["mindar-image-system"];
  });

  const startButton = document.querySelector("#example-start-button");
  const stopButton = document.querySelector("#example-stop-button");
  const pauseButton = document.querySelector("#example-pause-button");
  const pauseKeepVideoButton = document.querySelector("#example-pause-keep-video-button");
  const unpauseButton = document.querySelector("#example-unpause-button");

  startButton.addEventListener("click", () => {
    console.log("Iniciando o sistema AR");
    arSystem.start();
  });

  stopButton.addEventListener("click", () => {
    console.log("Parando o sistema AR");
    arSystem.stop();
  });

  pauseButton.addEventListener("click", () => {
    console.log("Pausando o sistema AR");
    arSystem.pause();
  });

  pauseKeepVideoButton.addEventListener("click", () => {
    console.log("Pausando o AR (mantendo vídeo)");
    arSystem.pause(true);
  });

  unpauseButton.addEventListener("click", () => {
    console.log("Retomando o sistema AR");
    arSystem.unpause();
  });

  sceneEl.addEventListener("arReady", () => {
    console.log("MindAR está pronto");
  });

  sceneEl.addEventListener("arError", () => {
    console.error("Erro no MindAR");
  });

  const slides = document.querySelectorAll(".slides");
  if (slides.length > 0) {
    document.querySelectorAll(".left-arrow").forEach((el) => {
      el.addEventListener("click", () => {
        let currentIndex = [...slides].findIndex(
          (slide) => slide.getAttribute("visible") == "true"
        );
        slides[currentIndex].setAttribute("visible", false);
        currentIndex = currentIndex === 0 ? slides.length - 1 : currentIndex - 1;
        slides[currentIndex].setAttribute("visible", true);
      });
    });

    document.querySelectorAll(".right-arrow").forEach((el) => {
      el.addEventListener("click", () => {
        let currentIndex = [...slides].findIndex(
          (slide) => slide.getAttribute("visible") == "true"
        );
        slides[currentIndex].setAttribute("visible", false);
        currentIndex = currentIndex === slides.length - 1 ? 0 : currentIndex + 1;
        slides[currentIndex].setAttribute("visible", true);
      });
    });
  } else if (document.querySelector("a-gltf-model")) {
    console.log("GLTF detectado na cena AR.");
    // Aqui você pode adicionar suporte para interação com modelos 3D se necessário
  }
}
