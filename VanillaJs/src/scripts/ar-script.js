import "aframe";
import "mind-ar/dist/mindar-image-aframe.prod.js";

export function initARControls() {
    const sceneEl = document.querySelector('a-scene');
    if (!sceneEl) {
        console.error("Nenhum <a-scene> encontrado no DOM!");
        return;
    }

    let arSystem;
    sceneEl.addEventListener('loaded', function () {
        arSystem = sceneEl.systems["mindar-image-system"];
    });

    const startButton = document.querySelector("#example-start-button");
    const stopButton = document.querySelector("#example-stop-button");
    const pauseButton = document.querySelector("#example-pause-button");
    const pauseKeepVideoButton = document.querySelector("#example-pause-keep-video-button");
    const unpauseButton = document.querySelector("#example-unpause-button");

    startButton.addEventListener('click', () => {
        console.log("starting AR system");
        arSystem.start();
    });
    stopButton.addEventListener('click', () => {
        arSystem.stop();
    });
    pauseButton.addEventListener('click', () => {
        arSystem.pause();
    });
    pauseKeepVideoButton.addEventListener('click', () => {
        arSystem.pause(true);
    });
    unpauseButton.addEventListener('click', () => {
        arSystem.unpause();
    });

    // Eventos adicionais (opcional)
    sceneEl.addEventListener("arReady", () => {
        console.log("MindAR está pronto");
    });

    sceneEl.addEventListener("arError", () => {
        console.log("MindAR falhou");
    });

    document.querySelectorAll(".left-arrow").forEach(el => {
        el.addEventListener("click", () => {
            const slides = document.querySelectorAll(".slides");
						console.log("slides", slides);
            let currentIndex = [...slides].findIndex(slide => slide.getAttribute("visible") == true);
						console.log("currentIndex before", currentIndex);
            slides[currentIndex].setAttribute("visible", false);
            currentIndex = (currentIndex == 0) ? slides.length - 1 : currentIndex - 1;
						console.log("currentIndex", currentIndex);
            slides[currentIndex].setAttribute("visible", true);
        });
    });

    document.querySelectorAll(".right-arrow").forEach(el => {
        el.addEventListener("click", () => {
            const slides = document.querySelectorAll(".slides");
            let currentIndex = [...slides].findIndex(slide => slide.getAttribute("visible") == true);
            slides[currentIndex].setAttribute("visible", false);
            currentIndex = (currentIndex === slides.length - 1) ? 0 : currentIndex + 1;
            slides[currentIndex].setAttribute("visible", true);
        });
    });
}