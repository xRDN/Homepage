import * as THREE from 'three';

export class Player {
  constructor(id, scene, uiLayer, isLocal = false) {
    this.id = id;
    this.scene = scene;
    this.uiLayer = uiLayer;
    this.isLocal = isLocal;
    this.targetPos = new THREE.Vector3();

    this.mesh = new THREE.LOD();
    
    // --- HIGH DETAIL CHARACTER (CHIBI-MECHA) ---
    const groupHigh = new THREE.Group();

    // 1. Oversized Head (Classic Chibi 1:1 Ratio - Ceramic White)
    const headGeo = new THREE.SphereGeometry(0.45, 32, 32);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.1, metalness: 0.2 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.9;
    
    // 2. Digital Faceplate (Glossy Black)
    const screenGeo = new THREE.CapsuleGeometry(0.18, 0.35, 16, 16);
    const screenMat = new THREE.MeshStandardMaterial({ color: 0x020202, roughness: 0.0, metalness: 0.9 });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.rotation.z = Math.PI / 2;
    screen.position.set(0, 0.9, 0.32);

    // 3. Expressive Glowing Eyes (Cyan Dots)
    const eyeGeo = new THREE.SphereGeometry(0.06, 16, 16);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x06b6d4, emissiveIntensity: 2.5 });
    
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(0.14, 0.92, 0.48);
    
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(-0.14, 0.92, 0.48);

    // 4. Mecha Cat Ears (Cool but cute silhouette)
    const earGeo = new THREE.ConeGeometry(0.1, 0.2, 16);
    const earMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.8 });
    
    const leftEar = new THREE.Mesh(earGeo, earMat);
    leftEar.position.set(0.25, 1.25, 0);
    leftEar.rotation.z = -0.25;
    
    const rightEar = new THREE.Mesh(earGeo, earMat);
    rightEar.position.set(-0.25, 1.25, 0);
    rightEar.rotation.z = 0.25;

    // 5. Tiny Stubby Body (Dark Metal)
    const bodyGeo = new THREE.CapsuleGeometry(0.22, 0.15, 16, 16);
    const body = new THREE.Mesh(bodyGeo, earMat);
    body.position.y = 0.35;

    // 6. Floating Paws
    const handGeo = new THREE.SphereGeometry(0.1, 16, 16);
    const lHand = new THREE.Mesh(handGeo, headMat);
    lHand.position.set(0.32, 0.4, 0.15);
    lHand.name = "lHand"; // Named for safe physics targeting
    
    const rHand = new THREE.Mesh(handGeo, headMat);
    rHand.position.set(-0.32, 0.4, 0.15);
    rHand.name = "rHand";

    // 7. Mini Thruster Backpack
    const packGeo = new THREE.BoxGeometry(0.2, 0.25, 0.12);
    const pack = new THREE.Mesh(packGeo, headMat);
    pack.position.set(0, 0.4, -0.25);

    groupHigh.add(head, screen, leftEye, rightEye, leftEar, rightEar, body, lHand, rHand, pack);

    // --- LOW DETAIL CHARACTER (For Distant Optimization) ---
    const geoLow = new THREE.BoxGeometry(0.6, 1.2, 0.6);
    const matLow = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const meshLow = new THREE.Mesh(geoLow, matLow);
    meshLow.position.y = 0.6;

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
    headPos.y += 1.5; // Lowered to match the new compact height
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
