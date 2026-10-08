import * as THREE from 'three';

export class Player {
  constructor(id, scene, uiLayer, isLocal = false) {
    this.id = id;
    this.scene = scene;
    this.uiLayer = uiLayer;
    this.isLocal = isLocal;
    this.targetPos = new THREE.Vector3();

    this.mesh = new THREE.LOD();
    
    // --- HIGH DETAIL CHARACTER (ANIMAL SLIME) ---
    const groupHigh = new THREE.Group();
    groupHigh.name = "slimeCore"; // Named for the physics loop

    // Advanced Jelly Material (Subsurface scattering look)
    const slimeMat = new THREE.MeshPhysicalMaterial({
      color: 0x06b6d4,       // Cyan base
      metalness: 0.1,
      roughness: 0.2,
      transmission: 0.6,     // Glass-like translucency
      thickness: 0.5,        // Light refraction depth
      clearcoat: 1.0,        // Wet, shiny exterior
      clearcoatRoughness: 0.1
    });

    // 1. Base Slime Body (Pivot moved to bottom for proper squashing)
    const bodyGeo = new THREE.SphereGeometry(0.4, 32, 32);
    bodyGeo.translate(0, 0.4, 0); 
    const body = new THREE.Mesh(bodyGeo, slimeMat);

    // 2. Animal Ears (Cat shape)
    const earGeo = new THREE.ConeGeometry(0.12, 0.25, 16);
    earGeo.translate(0, 0.125, 0); // Pivot at the base of the ear

    const leftEar = new THREE.Mesh(earGeo, slimeMat);
    leftEar.position.set(0.2, 0.7, 0);
    leftEar.rotation.set(-0.1, 0, -0.3);

    const rightEar = new THREE.Mesh(earGeo, slimeMat);
    rightEar.position.set(-0.2, 0.7, 0);
    rightEar.rotation.set(-0.1, 0, 0.3);

    // 3. Cute Dot Eyes
    const eyeGeo = new THREE.SphereGeometry(0.05, 16, 16);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a }); // Dark navy
    
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(0.15, 0.45, 0.35);
    
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(-0.15, 0.45, 0.35);

    // 4. Pink Blush Cheeks
    const blushGeo = new THREE.SphereGeometry(0.06, 16, 16);
    blushGeo.scale(1, 0.5, 0.2); // Flatten into ovals
    const blushMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e }); // Rose pink
    
    const leftBlush = new THREE.Mesh(blushGeo, blushMat);
    leftBlush.position.set(0.25, 0.35, 0.35);
    
    const rightBlush = new THREE.Mesh(blushGeo, blushMat);
    rightBlush.position.set(-0.25, 0.35, 0.35);

    // Assemble the slime
    body.add(leftEar, rightEar, leftEye, rightEye, leftBlush, rightBlush);
    groupHigh.add(body);

    // --- LOW DETAIL CHARACTER (For Distant Optimization) ---
    const geoLow = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const matLow = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    const meshLow = new THREE.Mesh(geoLow, matLow);
    meshLow.position.y = 0.3;

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
    headPos.y += 1.2; // Adjusted for shorter slime height
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
