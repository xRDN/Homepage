import * as THREE from 'three';
import { Player } from './player.js';
import { triggerAtmosphereSwell } from './audio.js';

let engineState = 'INTRO';

// --- CORE SETUP ---
const canvas = document.querySelector('#webgl');
const scene = new THREE.Scene();

// 1. Brighten the Atmosphere & Background
scene.background = new THREE.Color(0xf8fafc); // Bright slate white
scene.fog = new THREE.FogExp2(0xf8fafc, 0.012); // Light atmospheric haze

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(0, 40, 30);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
// Softer tone mapping for daylight
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// --- BUILD THE BRIGHT LABORATORY ---
const bunkerGroup = new THREE.Group();
scene.add(bunkerGroup);

// 2. Lightened Materials
const concreteMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.8, metalness: 0.1 }); // Light gray concrete
const darkMetal = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4, metalness: 0.7 }); // Bright steel
const cardboardMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.9 }); // Vibrant cardboard

// Widened Floor
const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), concreteMat);
floor.rotation.x = -Math.PI / 2;
bunkerGroup.add(floor);

// Distant Walls
const wallGeo = new THREE.BoxGeometry(80, 15, 1);
const wallN = new THREE.Mesh(wallGeo, concreteMat); wallN.position.set(0, 7.5, -40);
const wallS = new THREE.Mesh(wallGeo, concreteMat); wallS.position.set(0, 7.5, 40);
const wallE = new THREE.Mesh(wallGeo, concreteMat); wallE.position.set(40, 7.5, 0); wallE.rotation.y = Math.PI / 2;
const wallW = new THREE.Mesh(wallGeo, concreteMat); wallW.position.set(-40, 7.5, 0); wallW.rotation.y = Math.PI / 2;
bunkerGroup.add(wallN, wallS, wallE, wallW);

// Spaced Pillars
const pillarGeo = new THREE.BoxGeometry(2, 15, 2);
const pillarPositions = [ [-20, -20], [20, -20], [-20, 20], [20, 20] ];
pillarPositions.forEach(pos => {
  const pillar = new THREE.Mesh(pillarGeo, darkMetal);
  pillar.position.set(pos[0], 7.5, pos[1]);
  bunkerGroup.add(pillar);
});

// 3. Global Daylight Illumination
scene.add(new THREE.AmbientLight(0xffffff, 2.5)); // Strong white ambient bounce

// Hemisphere light acts as a giant skybox light (Sky Color, Ground Color, Intensity)
const hemiLight = new THREE.HemisphereLight(0xffffff, 0xe2e8f0, 2.0);
scene.add(hemiLight);

// Sunlight casting across the floor
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

  // Point lights add local color accents to the bright room
  const light = new THREE.PointLight(hexColor, intensity, 60, 1.5);
  light.position.set(x, y, z);
  
  bunkerGroup.add(bulb, wire, light);
}

// Accent lights
createLightbulb(0, 10, 0, 0xffffff, 50);
createLightbulb(-20, 9, -20, 0x38bdf8, 60);
createLightbulb(20, 9, -20, 0xa855f7, 60);
createLightbulb(0, 9, 20, 0xffeedd, 50);

// Project Showcases
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

// Cardboard Social Box
const cardboard = new THREE.Mesh(new THREE.BoxGeometry(4, 5, 1), cardboardMat);
cardboard.position.set(0, 2.5, -12);
cardboard.rotation.y = -0.15;
cardboard.rotation.z = 0.05;
bunkerGroup.add(cardboard);

// --- SPATIAL UI ANCHORS ---
const uiLayer = document.getElementById('ui-layer');
const socialSign = document.createElement('div');
socialSign.style.cssText = `
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: auto;
  opacity: 0;
  transition: opacity 0.3s;
`;

socialSign.innerHTML = `
  <a href="https://linkedin.com" target="_blank" style="background:#0a66c2; color:white; padding:10px 24px; text-decoration:none; border-radius:6px; font-weight:800; font-size:14px; text-align:center; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">LINKEDIN</a>
  <a href="https://github.com" target="_blank" style="background:#24292e; color:white; padding:10px 24px; text-decoration:none; border-radius:6px; font-weight:800; font-size:14px; text-align:center; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">GITHUB</a>
  <a href="https://x.com" target="_blank" style="background:#000000; color:white; border:1px solid #e2e8f0; padding:10px 24px; text-decoration:none; border-radius:6px; font-weight:800; font-size:14px; text-align:center; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">X.COM</a>
`;
uiLayer.appendChild(socialSign);

// --- ENTITIES ---
const players = new Map();
const localPlayer = new Player('local_' + Math.floor(Math.random() * 1000), scene, uiLayer, true);
players.set(localPlayer.id, localPlayer);

// --- INPUT & CONTROLS ---
const keys = { w: false, a: false, s: false, d: false };
window.addEventListener('keydown', (e) => {
  if (document.activeElement === document.getElementById('chat-input') || engineState !== 'INTERACTIVE') return;
  if (keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = true;
});
window.addEventListener('keyup', (e) => {
  if (keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = false;
});

// --- TRANSITION SEQUENCE ---
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

  setTimeout(() => remotePlayer.say('Wow, the lighting in here is great.'), 1000);
  setTimeout(() => remotePlayer.targetPos.set(0, 0, -8), 3500); 
}

// --- UI CHAT LOGIC ---
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

  players.forEach((player) => {
    player.mesh.update(camera);
    player.updateSpatialUI(camera);

    const slimeCore = player.mesh.levels[0].object.getObjectByName("slimeCore");
    if (slimeCore) {
      const jumpTrajectory = Math.abs(Math.sin(time * 1.5));
      slimeCore.position.y = jumpTrajectory * 0.7;

      const stretch = 1 + jumpTrajectory * 0.2; 
      const squash = 1 - jumpTrajectory * 0.1;
      
      let impact = 0;
      if (jumpTrajectory < 0.2) impact = (0.2 - jumpTrajectory) * 2.0;

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
