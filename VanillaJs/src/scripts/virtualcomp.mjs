import Hyperbeam from "@hyperbeam/web";

export function startIframe() {
  let sessionId = null; // para cleanup ao sair

  // Importa o DotEnv para carregar o IP do servidor usando o VITE, se não estiver definido, usa 'localhost'
  const SERVER_IP   = import.meta.env.VITE_SERVER_IP   || 'localhost';
  const SERVER_PORT = import.meta.env.VITE_SERVER_PORT || '3000';

  console.log(`Conectando ao servidor AR em: ${SERVER_IP}`);

  AFRAME.registerComponent('hyperbeam', {
    async init() {
      // -- Setup de mesh e textura --
      const original = this.el.getObject3D('mesh');
      const geometry = original.geometry.clone();
      const { width, height } = geometry.parameters;
      if (!navigator.userAgent.includes("Firefox")) {
        geometry.rotateZ(Math.PI);
        geometry.rotateY(Math.PI);
      }
      const texture = new THREE.Texture();
      const renderer = this.el.sceneEl.renderer;
      const material = new THREE.MeshBasicMaterial({ map: texture });
      material.side = THREE.DoubleSide;
      const plane = new THREE.Mesh(geometry, material);
      this.el.setObject3D('mesh', plane);

      // -- Cria ou reutiliza sessão Hyperbeam via backend --
      const moodleUrl = "https://www.dcc.ufrrj.br/moodle/login/index.php";
      const response = await fetch(`/api/hyperbeam/create-room`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initial_url: moodleUrl })
      });
      console.log("Solicitando sessão Hyperbeam para:", moodleUrl);

      if (response.status === 429) {
        console.error("Limite de sessões Hyperbeam atingido. Tente novamente mais tarde.");
        return;
      }
      if (!response.ok) {
        const errorMsg = await response.text();
        console.error("Falha ao criar/recuperar sessão Hyperbeam:", errorMsg);
        return;
      }

      // Leitura única do body JSON
      const data = await response.json();
      const { sessionId: sid, embedURL, adminToken } = data;
      if (!sid || !embedURL) {
        console.error("Resposta inválida do servidor:", JSON.stringify(data));
        return;
      }
      console.log("Usando sessão Hyperbeam:", sid, "→", embedURL);
      sessionId = sid;

      // // Cleanup ao sair da página
      // window.addEventListener('unload', () => {
      //   if (!sessionId) return;
      //   navigator.sendBeacon(
      //     "http://localhost:3000/api/hyperbeam/terminate-room",
      //     JSON.stringify({ session_id: sessionId })
      //   );
      // });

      // -- Renderiza o Hyperbeam usando import correto --
      const hbcontainer = document.getElementById("hbcontainer");
      const hb = await Hyperbeam(hbcontainer, embedURL, {
        frameCb: frame => {
          if (!texture.image) {
            if (frame instanceof HTMLVideoElement) {
              frame.width = frame.videoWidth;
              frame.height = frame.videoHeight;
            }
            texture.image = frame;
            texture.needsUpdate = true;
          } else {
            renderer.copyTextureToTexture(
              new THREE.Vector2(0, 0),
              new THREE.Texture(frame),
              texture
            );
          }
        },
        audioTrackCb: track => {
          let audioEl = document.getElementById("audio");
          if (!audioEl) {
            audioEl = document.createElement('audio');
            audioEl.id = 'audio';
            audioEl.autoplay = true;
            document.body.appendChild(audioEl);
          }
          audioEl.srcObject = new MediaStream([track]);
          this.el.addEventListener('sound-loaded', () => {
            this.el.components.sound.playSound();
          });
        }
      });

      // -- Eventos de interação --
      const handlePointer = e => {
        const pt = e.detail.intersection.point.clone();
        plane.worldToLocal(pt);
        hb.sendEvent({
          type: e.type,
          x: pt.x / width + 0.5,
          y: -pt.y / height + 0.5,
          button: 0
        });
      };
      this.el.addEventListener('mousedown', handlePointer);
      this.el.addEventListener('mouseup', handlePointer);
      window.addEventListener('wheel', e => {
        if (this.el.is('cursor-hovered')) {
          hb.sendEvent({ type: 'wheel', deltaY: e.deltaY });
        }
      });
    }
  });
}