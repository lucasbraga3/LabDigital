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

  AFRAME.registerComponent('drag-rotator', {
    schema: {
      speed:    { type: 'number', default: 1 },
      zoomSpeed:{ type: 'number', default: 0.001 },
      minScale: { type: 'number', default: 0.1 },
      maxScale: { type: 'number', default: 5 }
    },

    init: function() {
      // estados de arraste
      this.dragging   = false;
      this.startX     = 0;
      this.startY     = 0;

      // estados de pinça
      this.pinching   = false;
      this.startDist  = 0;
      this.startScale = new THREE.Vector3();

      // listeners mouse
      document.addEventListener('mousedown', this._onMouseDown.bind(this));
      document.addEventListener('mousemove', this._onMouseMove.bind(this));
      document.addEventListener('mouseup',   this._onMouseUp.bind(this));
      document.addEventListener('wheel',     this._onMouseWheel.bind(this));

      // listeners touch
      document.addEventListener('touchstart', this._onTouchStart.bind(this), { passive: false });
      document.addEventListener('touchmove',  this._onTouchMove.bind(this),  { passive: false });
      document.addEventListener('touchend',   this._onTouchEnd.bind(this));
    },

    // --- MOUSE DRAG ---
    _onMouseDown: function(evt) {
      this.dragging = true;
      this.startX   = evt.clientX;
      this.startY   = evt.clientY;
    },
    _onMouseMove: function(evt) {
      if (!this.dragging) return;
      const dx = evt.clientX - this.startX;
      const dy = evt.clientY - this.startY;
      this._applyRotation(dx, dy);
      this.startX = evt.clientX;
      this.startY = evt.clientY;
    },
    _onMouseUp: function() {
      this.dragging = false;
    },

    // --- WHEEL ZOOM ---
    _onMouseWheel: function(evt) {
      evt.preventDefault();
      const scaleFactor = 1 - evt.deltaY * this.data.zoomSpeed;
      this._applyZoom(scaleFactor);
    },

    // --- TOUCH START (drag ou pinch) ---
    _onTouchStart: function(evt) {
      if (evt.touches.length === 1) {
        // inicia arraste touch
        this.dragging = true;
        this.startX   = evt.touches[0].clientX;
        this.startY   = evt.touches[0].clientY;
      }
      else if (evt.touches.length === 2) {
        // inicia pinça
        this.pinching = true;
        const d = this._getTouchDist(evt.touches);
        this.startDist = d;
        // guarda escala inicial
        this.startScale.copy(this.el.object3D.scale);
      }
    },
    _onTouchMove: function(evt) {
      if (this.dragging && evt.touches.length === 1) {
        evt.preventDefault();
        const dx = evt.touches[0].clientX - this.startX;
        const dy = evt.touches[0].clientY - this.startY;
        this._applyRotation(dx, dy);
        this.startX = evt.touches[0].clientX;
        this.startY = evt.touches[0].clientY;
      }
      else if (this.pinching && evt.touches.length === 2) {
        evt.preventDefault();
        const d = this._getTouchDist(evt.touches);
        const factor = d / this.startDist;
        this._setScale(
          this.startScale.x * factor,
          this.startScale.y * factor,
          this.startScale.z * factor
        );
      }
    },
    _onTouchEnd: function(evt) {
      if (evt.touches.length === 0) {
        this.dragging = false;
        this.pinching = false;
      }
    },

    // --- helpers ---
    _applyRotation: function(dx, dy) {
      // escolhe eixo dominante
      if (Math.abs(dx) > Math.abs(dy)) {
        this.el.object3D.rotateY(dx * this.data.speed / 1000);
      } else {
        this.el.object3D.rotateX(dy * this.data.speed / 1000);
      }
    },
    _applyZoom: function(factor) {
      const s = this.el.object3D.scale;
      const newS = s.clone().multiplyScalar(factor);
      this._clampAndSetScale(newS);
    },
    _setScale: function(x, y, z) {
      this._clampAndSetScale(new THREE.Vector3(x, y, z));
    },
    _clampAndSetScale: function(v) {
      const m = this.data.minScale;
      const M = this.data.maxScale;
      v.x = THREE.MathUtils.clamp(v.x, m, M);
      v.y = THREE.MathUtils.clamp(v.y, m, M);
      v.z = THREE.MathUtils.clamp(v.z, m, M);
      this.el.object3D.scale.copy(v);
    },
    _getTouchDist: function(touches) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.hypot(dx, dy);
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