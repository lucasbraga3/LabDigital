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

    AFRAME.registerComponent('drag-rotator',{
        schema : { speed : {default:1}},
        init : function(){
          this.ifMouseDown = false;
          this.x_cord = 0;
          this.y_cord = 0;
          document.addEventListener('mousedown',this.OnDocumentMouseDown.bind(this));
          document.addEventListener('mouseup',this.OnDocumentMouseUp.bind(this));
          document.addEventListener('mousemove',this.OnDocumentMouseMove.bind(this));
        },
        OnDocumentMouseDown : function(event){
          this.ifMouseDown = true;
          this.x_cord = event.clientX;
          this.y_cord = event.clientY;
        },
        OnDocumentMouseUp : function(){
          this.ifMouseDown = false;
        },
        OnDocumentMouseMove : function(event)
        {
          if(this.ifMouseDown)
          {
            var temp_x = event.clientX-this.x_cord;
            var temp_y = event.clientY-this.y_cord;
            if(Math.abs(temp_y)<Math.abs(temp_x))
            {
              this.el.object3D.rotateY(temp_x*this.data.speed/1000);
            }
            else
            {
              this.el.object3D.rotateX(temp_y*this.data.speed/1000);
            }
            this.x_cord = event.clientX;
            this.y_cord = event.clientY;
          }
        }
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