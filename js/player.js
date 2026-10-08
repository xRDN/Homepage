import * as THREE from 'three';

export class Player {
  constructor(id, scene, uiLayer, isLocal = false) {
    this.id = id;
    this.scene = scene;
    this.uiLayer = uiLayer;
    this.isLocal = isLocal;
    this.targetPos = new THREE.Vector3();

    // --- NEW: Physics & Animation State ---
    this.animTime = 0;
    this.isJumping = false;
    this.jumpIntensity = 0.5;

    this.mesh = new THREE.LOD();
    
    // --- HIGH DETAIL CHARACTER (ANIMAL SLIME) ---
    const groupHigh = new THREE.Group();
    groupHigh.name = "slimeCore";

    const slimeMat = new THREE.MeshPhysicalMaterial({
      color: 0x06b6d4,       
      metalness: 0.1,
      roughness: 0.2,
      transmission: 0.6,     
      thickness: 0.5,        
      clearcoat: 1.0,        
      clearcoatRoughness: 0.1
    });

    const bodyGeo = new THREE.SphereGeometry(0.4, 32, 32);
    bodyGeo.translate(0, 0.4, 0); 
    const body = new THREE.Mesh(bodyGeo, slimeMat);

    const earGeo = new THREE.ConeGeometry(0.12, 0.25, 16);
    earGeo.translate(0, 0.125, 0);

    const leftEar = new THREE.Mesh(earGeo, slimeMat);
    leftEar.position.set(0.2, 0.7, 0);
    leftEar.rotation.set(-0.1, 0, -0.3);

    const rightEar = new THREE.Mesh(earGeo, slimeMat);
    rightEar.position.set(-0.2, 0.7, 0);
    rightEar.rotation.set(-0.1, 0, 0.3);

    const eyeGeo = new THREE.SphereGeometry(0.05, 16, 16);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a }); 
    
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(0.15, 0.45, 0.35);
    
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(-0.15, 0.45, 0.35);

    const blushGeo = new THREE.SphereGeometry(0.06, 16, 16);
    blushGeo.scale(1, 0.5, 0.2); 
    const blushMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e }); 
    
    const leftBlush = new THREE.Mesh(blushGeo, blushMat);
    leftBlush.position.set(0.25, 0.35, 0.35);
    
    const rightBlush = new THREE.Mesh(blushGeo, blushMat);
    rightBlush.position.set(-0.25, 0.35, 0.35);

    body.add(leftEar, rightEar, leftEye, rightEye, leftBlush, rightBlush);
    groupHigh.add(body);

    // --- LOW DETAIL CHARACTER ---
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
    headPos.y += 1.2; 
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
