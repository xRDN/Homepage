import * as THREE from 'three';

export class Player {
  constructor(id, scene, uiLayer, isLocal = false, type = 'slime') {
    this.id = id;
    this.scene = scene;
    this.uiLayer = uiLayer;
    this.isLocal = isLocal;
    this.type = type;
    this.targetPos = new THREE.Vector3();
    this.targetQuat = new THREE.Quaternion();

    this.animTime = 0;
    this.isJumping = false;
    this.jumpIntensity = 0.5;

    this.mesh = new THREE.Group(); // Replaced LOD for precise animation control
    this.buildCharacter();
    this.scene.add(this.mesh);

    // Spatial UI
    this.chatElement = document.createElement('div');
    this.chatElement.className = 'chat-bubble';
    this.nameElement = document.createElement('div');
    this.nameElement.className = 'nameplate';
    this.nameElement.innerText = isLocal ? "You" : `ID_${id.substring(0, 4)}`;
    this.uiLayer.appendChild(this.chatElement);
    this.uiLayer.appendChild(this.nameElement);
    this.chatTimeout = null;
  }

  buildCharacter() {
    this.core = new THREE.Group();
    
    if (this.type === 'slime') {
      const slimeMat = new THREE.MeshPhysicalMaterial({ color: 0x06b6d4, roughness: 0.2, transmission: 0.6, thickness: 0.5 });
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 32), slimeMat);
      body.position.y = 0.4; 
      
      const earGeo = new THREE.ConeGeometry(0.12, 0.25, 16);
      earGeo.translate(0, 0.125, 0);
      const lEar = new THREE.Mesh(earGeo, slimeMat); lEar.position.set(0.2, 0.7, 0); lEar.rotation.set(-0.1, 0, -0.3);
      const rEar = new THREE.Mesh(earGeo, slimeMat); rEar.position.set(-0.2, 0.7, 0); rEar.rotation.set(-0.1, 0, 0.3);
      
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
      const lEye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), eyeMat); lEye.position.set(0.15, 0.45, 0.35);
      const rEye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), eyeMat); rEye.position.set(-0.15, 0.45, 0.35);

      this.core.add(body, lEar, rEar, lEye, rEye);
      this.mesh.add(this.core);

    } else if (this.type === 'mecha') {
      const headMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.1 });
      const metalMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
      
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 32, 32), headMat);
      head.position.y = 0.9;
      
      const screen = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.35, 16, 16), new THREE.MeshStandardMaterial({ color: 0x020202 }));
      screen.rotation.z = Math.PI / 2; screen.position.set(0, 0.9, 0.32);

      const eyeMat = new THREE.MeshStandardMaterial({ emissive: 0x06b6d4, emissiveIntensity: 2.5 });
      const lEye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), eyeMat); lEye.position.set(0.14, 0.92, 0.48);
      const rEye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), eyeMat); rEye.position.set(-0.14, 0.92, 0.48);

      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.15, 16, 16), metalMat);
      body.position.y = 0.35;

      this.lHand = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), headMat); this.lHand.position.set(0.32, 0.4, 0.15);
      this.rHand = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), headMat); this.rHand.position.set(-0.32, 0.4, 0.15);

      this.core.add(head, screen, lEye, rEye, body, this.lHand, this.rHand);
      this.mesh.add(this.core);
    }
  }

  // --- UNIQUE KINEMATICS ---
  updateAnimation(time, isMoving) {
    if (this.type === 'slime') {
      // Bouncing Slime Logic
      if (this.isJumping) {
        this.animTime += 0.12;     
        this.jumpIntensity = 2.0;  
        if (this.animTime >= Math.PI) { this.animTime = 0; this.isJumping = false; }
      } else if (isMoving) {
        this.animTime += 0.25;     
        this.jumpIntensity = 0.5;  
      } else {
        if (this.animTime > 0 && this.animTime < Math.PI) {
          this.animTime += 0.25;
          if (this.animTime >= Math.PI) this.animTime = 0;
        }
        this.jumpIntensity = 0.5;
      }

      const jumpTrajectory = Math.abs(Math.sin(this.animTime));
      this.core.position.y = jumpTrajectory * this.jumpIntensity;
      const stretch = 1 + jumpTrajectory * (0.2 * this.jumpIntensity); 
      const squash = 1 - jumpTrajectory * (0.1 * this.jumpIntensity);
      let impact = (jumpTrajectory < 0.2 && this.animTime > 0) ? (0.2 - jumpTrajectory) * 2.0 : 0;
      this.core.scale.set(squash + impact, stretch - impact, squash + impact);

    } else if (this.type === 'mecha') {
      // Hovering Mecha Logic
      const hover = Math.sin(time * 3) * 0.1;
      this.core.position.y = hover + (this.isJumping ? Math.sin(this.animTime) * 2.0 : 0);
      
      if (this.isJumping) {
        this.animTime += 0.1;
        if (this.animTime >= Math.PI) { this.animTime = 0; this.isJumping = false; }
      }

      // Swing hands when moving
      if (isMoving) {
        this.lHand.position.z = 0.15 + Math.sin(time * 10) * 0.2;
        this.rHand.position.z = 0.15 + Math.sin(time * 10 + Math.PI) * 0.2;
      } else {
        this.lHand.position.z += (0.15 - this.lHand.position.z) * 0.1;
        this.rHand.position.z += (0.15 - this.rHand.position.z) * 0.1;
      }
    }
  }

  say(message) {
    this.chatElement.innerText = message;
    this.chatElement.classList.add('visible');
    clearTimeout(this.chatTimeout);
    this.chatTimeout = setTimeout(() => { this.chatElement.classList.remove('visible'); }, 4000);
  }

  updateSpatialUI(camera) {
    const headPos = this.mesh.position.clone();
    headPos.y += this.type === 'slime' ? 1.2 : 1.6;
    headPos.project(camera);

    if (headPos.z > 1) {
      this.chatElement.style.display = 'none';
      this.nameElement.style.display = 'none';
      return;
    }

    const x = (headPos.x * 0.5 + 0.5) * window.innerWidth;
    const y = (headPos.y * -0.5 + 0.5) * window.innerHeight;
    this.chatElement.style.display = 'block';
    this.nameElement.style.display = 'block';
    this.chatElement.style.left = `${x}px`;
    this.chatElement.style.top = `${y}px`;
    this.nameElement.style.left = `${x}px`;
    this.nameElement.style.top = `${y}px`;
  }
}
