import * as THREE from 'three';

export class Player {
  constructor(id, scene, uiLayer, isLocal = false) {
    this.id = id;
    this.scene = scene;
    this.uiLayer = uiLayer;
    this.isLocal = isLocal;
    this.targetPos = new THREE.Vector3();

    this.mesh = new THREE.LOD();
    
    // --- HIGH DETAIL CHARACTER (CUTE + COOL) ---
    const groupHigh = new THREE.Group();

    // 1. Body (Dark industrial metal)
    const bodyGeo = new THREE.CapsuleGeometry(0.35, 0.4, 16, 16);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.8 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.55;
    groupHigh.add(body);

    // 2. Oversized Head (Sleek ceramic white)
    const headGeo = new THREE.SphereGeometry(0.45, 32, 32);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.1, metalness: 0.2 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.3;
    groupHigh.add(head);

    // 3. LED Visor (Glowing Cyan)
    const visorGeo = new THREE.BoxGeometry(0.55, 0.2, 0.4);
    const visorMat = new THREE.MeshStandardMaterial({ 
      color: 0x000000, 
      emissive: 0x06b6d4, 
      emissiveIntensity: 1.5 
    });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 1.3, 0.3);
    // Add rounded corners to the visor via a secondary cylinder
    const glassGeo = new THREE.CapsuleGeometry(0.12, 0.4, 16, 16);
    const glass = new THREE.Mesh(glassGeo, visorMat);
    glass.rotation.z = Math.PI / 2;
    glass.position.set(0, 1.3, 0.45);
    groupHigh.add(visor, glass);

    // 4. Floating Hands (Cute proportions)
    const handGeo = new THREE.SphereGeometry(0.15, 16, 16);
    const lHand = new THREE.Mesh(handGeo, headMat);
    lHand.position.set(0.55, 0.7, 0.2);
    const rHand = new THREE.Mesh(handGeo, headMat);
    rHand.position.set(-0.55, 0.7, 0.2);
    groupHigh.add(lHand, rHand);

    // --- LOW DETAIL CHARACTER (For Distant Optimization) ---
    const geoLow = new THREE.BoxGeometry(0.8, 1.5, 0.8);
    const matLow = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const meshLow = new THREE.Mesh(geoLow, matLow);
    meshLow.position.y = 0.75;

    // Compile LOD levels
    this.mesh.addLevel(groupHigh, 0);
    this.mesh.addLevel(meshLow, 25);
    this.scene.add(this.mesh);

    // --- SPATIAL UI ---
    this.chatElement = document.createElement('div');
    this.chatElement.className = 'chat-bubble';

    this.nameElement = document.createElement('div');
    this.nameElement.className = 'nameplate';
    this.nameElement.innerText = isLocal ? "You" : `ID_${id.substring(0, 4)}`;

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
    headPos.y += 2.0; // Adjusted for shorter character height
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
