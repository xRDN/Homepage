import * as THREE from 'three';
import { Player } from './player.js';
import { triggerAtmosphereSwell } from './audio.js';

let engineState = 'INTRO';

const canvas = document.querySelector('#webgl');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf8fafc); 
scene.fog = new THREE.FogExp2(0xf8fafc, 0.012); 

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(0, 40, 30);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// --- ENVIRONMENT ---
const bunkerGroup = new THREE.Group();
scene.add(bunkerGroup);

const concreteMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.8, metalness: 0.1 });
const darkMetal = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4, metalness: 0.7 });
const cardboardMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.9 });

const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), concreteMat);
floor.rotation.x = -Math.PI / 2;
bunkerGroup.add(floor);

const wallGeo = new THREE.BoxGeometry(80, 15, 1);
const wallN = new THREE.Mesh(wallGeo, concreteMat); wallN.position.set(0, 7.5, -40);
const wallS = new THREE.Mesh(wallGeo, concreteMat); wallS.position.set(0, 7.5, 40);
const wallE = new THREE.Mesh(wallGeo, concreteMat); wallE.position.set(40, 7.5, 0); wallE.rotation.y = Math.PI / 2;
const wallW = new THREE.Mesh(wallGeo, concreteMat); wallW.position.set(-40, 7.5, 0); wallW.rotation.y = Math.PI / 2;
bunkerGroup.add(wallN, wallS, wallE, wallW);

const pillarGeo = new THREE.BoxGeometry(2, 15, 2);
const pillarPositions = [ [-20, -20], [20, -20], [-20, 20], [20, 20] ];
pillarPositions.forEach(pos => {
  const pillar = new THREE.Mesh(pillarGeo, darkMetal);
  pillar.position.set(pos[0], 7.5, pos[1]);
  bunkerGroup.add(pillar);
});

// Lighting
scene.add(new THREE.AmbientLight(0xffffff, 2.5));
const hemiLight = new THREE.HemisphereLight(0xffffff, 0xe2e8f0, 2.0);
scene.add(hemiLight);
const sunLight = new THREE.DirectionalLight(0xfffbeb, 3.0);
sunLight.position.set(20, 30, 20);
scene.add(sunLight);

function createLightbulb(x, y, z, hexColor, intensity) {
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: hexColor, emissiveIntensity: 1.5 })
  );
  bulb.position.set(x, y, z);

  const wire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, y),
    new THREE.MeshBasicMaterial({ color: 0x64748b })
  );
  wire.position.set(x, y * 1.5, z);

  const light = new THREE.PointLight(hexColor, intensity, 60, 1.5);
  light.position.set(x, y, z);
  bunkerGroup.add(bulb, wire, light);
}

createLightbulb(0, 10, 0, 0xffffff, 50);
createLightbulb(-20, 9, -20, 0x38bdf8, 60);
createLightbulb(20, 9, -20, 0xa855f7, 60);
createLightbulb(0, 9, 20, 0xffeedd, 50);

const proj1Base = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.5, 1.5, 32), darkMetal);
proj1Base.position.set(-18, 0.75, -10);
const proj1Holo = new THREE.Mesh(
  new THREE.IcosahedronGeometry(1.5, 1),
  new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x38bdf8, wireframe: true })
);
proj1Holo.position.set(-18, 3.5, -10);
bunkerGroup.add(proj1Base, proj1Holo);

const proj2Base = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.5, 1.5, 32), darkMetal);
proj2Base.position.set(18, 0.75, -10);
const proj2Holo = new THREE.Mesh(
  new THREE.TorusKnotGeometry(1, 0.3, 100, 16),
  new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xa855f7, wireframe: true })
);
proj2Holo.position.set(18, 3.5, -10);
bunkerGroup.add(proj2Base, proj2Holo);

const cardboard = new THREE.Mesh(new THREE.BoxGeometry(4, 5, 1), cardboardMat);
cardboard.position.set(0, 2.5, -12);
cardboard.rotation.y = -0.15;
cardboard.rotation.z = 0.05;
bunkerGroup.add(cardboard);

// --- UI LAYERS ---
const uiLayer = document.getElementById('ui-layer');

const socialSign = document.createElement('div');
socialSign.style.cssText = `position: absolute; transform: translate(-50%, -50%); display: none; flex-direction: column; gap: 10px; pointer-events: auto; opacity: 0; transition: opacity 0.3s;`;
socialSign.innerHTML = `
  <a href="https://linkedin.com" target="_blank" style="background:#0a66c2; color:white; padding:10px 24px; text-decoration:none; border-radius:6px; font-weight:800; font-size:14px; text-align:center; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">LINKEDIN</a>
  <a href="https://github.com" target="_blank" style="background:#24292e; color:white; padding:10px 24px; text-decoration:none; border-radius:6px; font-weight:800; font-size:14px; text-align:center; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">GITHUB</a>
  <a href="https://x.com" target="_blank" style="background:#000000; color:white; border:1px solid #e2e8f0; padding:10px 24px; text-decoration:none; border-radius:6px; font-weight:800; font-size:14px; text-align:center; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">X.COM</a>
`;
uiLayer.appendChild(socialSign);

// NEW: Mobile Jump Button
const mobileJumpBtn = document.createElement('div');
mobileJumpBtn.style.cssText = `position: fixed; bottom: 2rem; right: 2rem; z-index: 25; opacity: 0; pointer-events: none; transition: opacity 1s ease;`;
mobileJumpBtn.innerHTML = `
  <button id="action-jump" style="background: #0f172a; color: #ffffff; width: 70px; height: 70px; border-radius: 50%; border: 4px solid #38bdf8; font-weight: 900; font-size: 14px; box-shadow: 0 8px 20px rgba(0,0,0,0.3); cursor: pointer; user-select: none; -webkit-user-select: none; touch-action: manipulation;">JUMP</button>
`;
document.body.appendChild(mobileJumpBtn);

// --- ENTITIES ---
const players = new Map();
const localPlayer = new Player('local_' + Math.floor(Math.random() * 1000), scene, uiLayer, true);
players.set(localPlayer.id, localPlayer);

// --- INPUT & CONTROLS ---
const keys = { w: false, a: false, s: false, d: false };

window.addEventListener('keydown', (e) => {
  if (document.activeElement === document.getElementById('chat-input') || engineState !== 'INTERACTIVE') return;
  if (keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = true;
  
  // Desktop Jump Trigger
  if (e.code === 'Space' && !localPlayer.isJumping) {
    localPlayer.isJumping = true;
  }
});

window.addEventListener('keyup', (e) => {
  if (keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = false;
});

// Mobile Jump Trigger
document.getElementById('action-jump').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  if (engineState === 'INTERACTIVE' && !localPlayer.isJumping) {
    localPlayer.isJumping = true;
  }
});

const introScreen = document.getElementById('intro-screen');
const chatInterface = document.getElementById('chat-interface');

introScreen.addEventListener('pointerdown', () => {
  if (engineState !== 'INTRO') return;
  engineState = 'WARPING';
  introScreen.classList.add('hidden');
  triggerAtmosphereSwell();
});

function spawnNetworkEvent() {
  const remoteId = 'remote_' + Math.floor(Math.random() * 9000);
  const remotePlayer = new Player(remoteId, scene, uiLayer, false);
  remotePlayer.mesh.position.set(-8, 0, -5);
  remotePlayer.targetPos.set(-8, 0, -5);
  players.set(remoteId, remotePlayer);

  setTimeout(() => remotePlayer.say('Press Spacebar or the button to jump!'), 1000);
  setTimeout(() => remotePlayer.targetPos.set(0, 0, -8), 3500); 
}

const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');
function handleSend() {
  if (chatInput.value.trim()) {
    localPlayer.say(chatInput.value.trim());
    chatInput.value = '';
  }
}
chatSend.addEventListener('click', handleSend);
chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleSend();
});

// --- RENDER PIPELINE ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  const time = Date.now() * 0.003;

  if (engineState === 'WARPING') {
    const idealOffset = new THREE.Vector3(0, 3, -7).applyQuaternion(localPlayer.mesh.quaternion).add(localPlayer.mesh.position);
    camera.position.lerp(idealOffset, 0.035);

    const lookTarget = localPlayer.mesh.position.clone();
    lookTarget.y += 1.0;
    camera.lookAt(lookTarget);

    if (camera.position.distanceTo(idealOffset) < 0.5) {
      engineState = 'INTERACTIVE';
      chatInterface.classList.add('unlocked');
      socialSign.style.opacity = '1'; 
      mobileJumpBtn.style.opacity = '1';
      mobileJumpBtn.style.pointerEvents = 'auto'; // Enable button interaction
      setTimeout(spawnNetworkEvent, 1500);
    }
  } else if (engineState === 'INTERACTIVE') {
    if (keys.a) localPlayer.mesh.rotation.y += 0.05;
    if (keys.d) localPlayer.mesh.rotation.y -= 0.05;

    const direction = new THREE.Vector3();
    localPlayer.mesh.getWorldDirection(direction);
    if (keys.w) localPlayer.mesh.position.addScaledVector(direction, 0.2);
    if (keys.s) localPlayer.mesh.position.addScaledVector(direction, -0.2);

    const idealOffset = new THREE.Vector3(0, 3, -7).applyQuaternion(localPlayer.mesh.quaternion).add(localPlayer.mesh.position);
    camera.position.lerp(idealOffset, 0.1);

    const lookTarget = localPlayer.mesh.position.clone();
    lookTarget.y += 1.0;
    camera.lookAt(lookTarget);
  }

  proj1Holo.rotation.x = time * 0.2;
  proj1Holo.rotation.y = time * 0.4;
  proj2Holo.rotation.x = -time * 0.3;
  proj2Holo.rotation.y = time * 0.5;

  const boardAnchor = new THREE.Vector3(0, 2.5, -11.4);
  boardAnchor.project(camera);
  
  if (boardAnchor.z < 1 && engineState === 'INTERACTIVE') {
    socialSign.style.display = 'flex';
    socialSign.style.left = `${(boardAnchor.x * 0.5 + 0.5) * window.innerWidth}px`;
    socialSign.style.top = `${(boardAnchor.y * -0.5 + 0.5) * window.innerHeight}px`;
    
    const distance = camera.position.distanceTo(new THREE.Vector3(0, 2.5, -12));
    const scale = Math.max(0.3, 10 / distance); 
    socialSign.style.transform = `translate(-50%, -50%) scale(${scale})`;
  } else {
    socialSign.style.display = 'none';
  }

  // --- STATE-DRIVEN SLIME KINEMATICS ---
  players.forEach((player) => {
    player.mesh.update(camera);
    player.updateSpatialUI(camera);

    const slimeCore = player.mesh.levels[0].object.getObjectByName("slimeCore");
    if (slimeCore) {
      // Evaluate Movement State
      const isLocalMoving = (player.isLocal) && (keys.w || keys.s || keys.a || keys.d);
      const isRemoteMoving = (!player.isLocal) && (player.mesh.position.distanceTo(player.targetPos) > 0.02);

      if (player.isJumping) {
        player.animTime += 0.12;     // Air time duration
        player.jumpIntensity = 2.0;  // Large vertical jump
        if (player.animTime >= Math.PI) {
          player.animTime = 0;       // Reset to ground
          player.isJumping = false;
        }
      } else if (isLocalMoving || isRemoteMoving) {
        player.animTime += 0.25;     // Quick pacing
        player.jumpIntensity = 0.5;  // Small walking hops
      } else {
        // Smoothly settle back to flat surface when stopped
        if (player.animTime > 0 && player.animTime < Math.PI) {
          player.animTime += 0.25;
          if (player.animTime >= Math.PI) player.animTime = 0;
        }
        player.jumpIntensity = 0.5;
      }

      const jumpTrajectory = Math.abs(Math.sin(player.animTime));
      slimeCore.position.y = jumpTrajectory * player.jumpIntensity;

      const stretch = 1 + jumpTrajectory * (0.2 * player.jumpIntensity); 
      const squash = 1 - jumpTrajectory * (0.1 * player.jumpIntensity);
      
      let impact = 0;
      if (jumpTrajectory < 0.2 && player.animTime > 0) {
        impact = (0.2 - jumpTrajectory) * 2.0;
      }

      slimeCore.scale.set(squash + impact, stretch - impact, squash + impact);
    }

    if (!player.isLocal) {
      player.mesh.position.lerp(player.targetPos, 0.05);
      player.mesh.lookAt(localPlayer.mesh.position.x, player.mesh.position.y, localPlayer.mesh.position.z);
    }
  });

  renderer.render(scene, camera);
}

animate();
