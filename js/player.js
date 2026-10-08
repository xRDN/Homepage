import * as THREE from 'three';

const matHigh = new THREE.MeshStandardMaterial({ color: 0x6366f1, roughness: 0.2 });
const matLow = new THREE.MeshBasicMaterial({ color: 0x4f46e5 });

export class Player {
  constructor(id, scene, uiLayer, isLocal = false) {
    this.id = id;
    this.scene = scene;
    this.uiLayer = uiLayer;
    this.isLocal = isLocal;
    this.targetPos = new THREE.Vector3();

    this.mesh = new THREE.LOD();
    
    // Level 0: High Detail
    const geoHigh = new THREE.CapsuleGeometry(0.5, 1, 16, 16);
    const meshHigh = new THREE.Mesh(geoHigh, matHigh);
    meshHigh.position.y = 1;

    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.2, 0.4),
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    visor.position.set(0, 0.4, 0.4);
    meshHigh.add(visor);

    // Level 1: Low Detail
    const geoLow = new THREE.BoxGeometry(1, 2, 1);
    const meshLow = new THREE.Mesh(geoLow, matLow);
    meshLow.position.y = 1;

    this.mesh.addLevel(meshHigh, 0);
    this.mesh.addLevel(meshLow, 20);
    this.scene.add(this.mesh);

    // 2D UI elements
    this.chatElement = document.createElement('div');
    this.chatElement.className = 'chat-bubble';

    this.nameElement = document.createElement('div');
    this.nameElement.className = 'nameplate';
    this.nameElement.innerText = isLocal ? "You" : `Visitor_${id.substring(0, 4)}`;

    this.uiLayer.appendChild(this.chatElement);
    this.uiLayer.appendChild(this.nameElement);
    this.chatTimeout = null;
  }

  say(message) {
    this.chatElement.innerText = message;
    this.chatElement.classList.add('visible');
    clearTimeout(this.chatTimeout);
    this.chatTimeout = setTimeout(() => {
      this.chatElement.classList.remove('visible');
    }, 4000);
  }

  updateSpatialUI(camera) {
    const headPos = this.mesh.position.clone();
    headPos.y += 2.2;
    headPos.project(camera);

    const x = (headPos.x * 0.5 + 0.5) * window.innerWidth;
    const y = (headPos.y * -0.5 + 0.5) * window.innerHeight;

    if (headPos.z > 1) {
      this.chatElement.style.display = 'none';
      this.nameElement.style.display = 'none';
      return;
    }

    this.chatElement.style.display = 'block';
    this.nameElement.style.display = 'block';
    this.chatElement.style.left = `${x}px`;
    this.chatElement.style.top = `${y}px`;
    this.nameElement.style.left = `${x}px`;
    this.nameElement.style.top = `${y}px`;
  }
}
