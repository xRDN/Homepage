import * as THREE from 'three';
import { Player } from './player.js';
import { triggerAtmosphereSwell } from './audio.js';

let engineState = 'INTRO'; 
let selectedChar = 'slime';

// --- UI EVENT LISTENERS ---
const introScreen = document.getElementById('intro-screen');
const selectScreen = document.getElementById('char-select-screen');
const chatInterface = document.getElementById('chat-interface');
const uiLayer = document.getElementById('ui-layer');

document.getElementById('btn-start').addEventListener('pointerdown', () => {
  if (engineState !== 'INTRO') return;
  engineState = 'SELECT';
  introScreen.classList.add('hidden');
  selectScreen.classList.add('visible');
  
  localPlayer = new Player('local_' + Math.floor(Math.random() * 1000), scene, uiLayer, true, selectedChar);
  localPlayer.mesh.position.set(0, 15, 0);
  players.set(localPlayer.id, localPlayer);
});

document.querySelectorAll('.char-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.char-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    selectedChar = e.target.dataset.type;
    if (localPlayer) localPlayer.swapCharacter(selectedChar);
  });
});

document.getElementById('btn-deploy').addEventListener('pointerdown', () => {
  if (engineState !== 'SELECT') return;
  engineState = 'WARPING';
  selectScreen.classList.remove('visible');
  triggerAtmosphereSwell();

  localPlayer.core.scale.set(1, 1, 1);
  localPlayer.mesh.rotation.y = 0;
  localPlayer.mesh.position.set(0, 0, 0);
});

// --- CORE WEBGL SETUP ---
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

const showcasePlatform = new THREE.Mesh(
  new THREE.CylinderGeometry(2, 2.5, 0.5, 64),
  new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2, metalness: 0.8 })
);
showcasePlatform.position.set(0, 14.75, 0);
bunkerGroup.add(showcasePlatform);

const showcaseLight = new THREE.SpotLight(0x38bdf8, 50, 15, 0.6, 0.5, 1);
showcaseLight.position.set(0, 22, 0);
showcaseLight.target = showcasePlatform;
bunkerGroup.add(showcaseLight);

scene.add(new THREE.AmbientLight(0xffffff, 2.5));
scene.add(new THREE.HemisphereLight(0xffffff, 0xe2e8f0, 2.0));
const sunLight = new THREE.DirectionalLight(0xfffbeb, 3.0);
sunLight.position.set(20, 30, 20);
scene.add(sunLight);

// --- 3D INTERACTIVE SOCIAL RELICS ---
const textureLoader = new THREE.TextureLoader();
const linkItems = [];

const cardboard = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 2), cardboardMat);
cardboard.position.set(0, 1.5, -12);
cardboard.rotation.y = -0.15;
bunkerGroup.add(cardboard);

function createIconPanel(textureUrl, url, xOffset, color) {
  const material = new THREE.MeshStandardMaterial({
    map: textureLoader.load(textureUrl),
    transparent: true,
    side: THREE.DoubleSide,
    emissive: color,
    emissiveIntensity: 0.1, 
    roughness: 0.2
  });
  
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), material);
  mesh.userData = { url: url, baseY: 4.5, color: color };
  mesh.position.set(xOffset, 4.5, -12);
  
  const backplate = new THREE.Mesh(
    new THREE.CircleGeometry(1.0, 32),
    new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.15 })
  );
  backplate.position.z = -0.05; 
  mesh.add(backplate);

  bunkerGroup.add(mesh);
  linkItems.push(mesh);
}

createIconPanel('https://cdn-icons-png.flaticon.com/512/174/174857.png', 'https://linkedin.com', -2.5, 0x0a66c2);
createIconPanel('https://cdn-icons-png.flaticon.com/512/25/25231.png', 'https://github.com', 0, 0x000000);
createIconPanel('https://cdn-icons-png.flaticon.com/512/5969/5969020.png', 'https://x.com', 2.5, 0x000000);

// --- RAYCASTING (HOVER & CLICK 3D ICONS) ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredMesh = null;

canvas.addEventListener('pointermove', (e) => {
  if (engineState !== 'INTERACTIVE') return;
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(linkItems);

  if (intersects.length > 0) {
    const object = intersects[0].object;
    if (hoveredMesh !== object) {
      if (hoveredMesh) resetHover(hoveredMesh);
      hoveredMesh = object;
      document.body.style.cursor = 'pointer';
      hoveredMesh.material.emissiveIntensity = 1.0; 
      hoveredMesh.scale.set(1.15, 1.15, 1.15);       
      hoveredMesh.children[0].material.opacity = 0.4;
    }
  } else {
    if (hoveredMesh) {
      resetHover(hoveredMesh);
      hoveredMesh = null;
      document.body.style.cursor = 'default';
    }
  }
});

function resetHover(mesh) {
  mesh.material.emissiveIntensity = 0.1;
  mesh.scale.set(1, 1, 1);
  mesh.children[0].material.opacity = 0.15;
}

// --- MOBILE UI INJECTION ---
const mobileJumpBtn = document.createElement('div');
mobileJumpBtn.className = 'hud-element';
mobileJumpBtn.style.cssText = `position: fixed; bottom: 2rem; right: 2rem; z-index: 25;`;
mobileJumpBtn.innerHTML = `<button id="action-jump" style="background: rgba(15,23,42,0.8); color: #ffffff; width: 70px; height: 70px; border-radius: 50%; border: 3px solid #38bdf8; font-weight: 900; font-size: 14px; box-shadow: 0 8px 20px rgba(0,0,0,0.3); cursor: pointer; backdrop-filter: blur(4px);">JUMP</button>`;
document.body.appendChild(mobileJumpBtn);

const joystickZone = document.createElement('div');
joystickZone.className = 'hud-element';
joystickZone.style.cssText = `position: fixed; bottom: 2rem; left: 2rem; width: 120px; height: 120px; background: rgba(15, 23, 42, 0.3); border-radius: 50%; border: 2px solid rgba(56, 189, 248, 0.5); z-index: 25; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); touch-action: none;`;
const joystickKnob = document.createElement('div');
joystickKnob.style.cssText = `width: 50px; height: 50px; background: rgba(56, 189, 248, 0.8); border-radius: 50%; pointer-events: none;`;
joystickZone.appendChild(joystickKnob);
document.body.appendChild(joystickZone);

// --- ENTITIES & KINEMATICS ---
const players = new Map();
let localPlayer;
const keys = { w: false, a: false, s: false, d: false };

window.addEventListener('keydown', (e) => {
  if (document.activeElement === document.getElementById('chat-input') || engineState !== 'INTERACTIVE') return;
  if (keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = true;
  if (e.code === 'Space' && !localPlayer.isJumping) localPlayer.isJumping = true;
});
window.addEventListener('keyup', (e) => {
  if (keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = false;
});
document.getElementById('action-jump').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  if (engineState === 'INTERACTIVE' && !localPlayer.isJumping) localPlayer.isJumping = true;
});

// Joystick Logic
let joyActive = false;
let joyDelta = { x: 0, y: 0 };
let joyOrigin = { x: 0, y: 0 };

joystickZone.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  joyActive = true;
  const rect = joystickZone.getBoundingClientRect();
  joyOrigin.x = rect.left + rect.width / 2;
  joyOrigin.y = rect.top + rect.height / 2;
});
window.addEventListener('pointermove', (e) => {
  if (!joyActive) return;
  let dx = e.clientX - joyOrigin.x, dy = e.clientY - joyOrigin.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > 35) { dx = (dx/dist)*35; dy = (dy/dist)*35; }
  joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
  joyDelta.x = dx / 35; joyDelta.y = dy / 35;
});
window.addEventListener('pointerup', () => {
  joyActive = false; joyDelta = { x: 0, y: 0 };
  joystickKnob.style.transform = `translate(0px, 0px)`;
});

// Free-Look Camera Drag (AND Raycaster Click fallback)
let camYaw = Math.PI, camPitch = 0.5, camDistance = 8, isDraggingCam = false;
const camZone = document.getElementById('camera-zone');

camZone.addEventListener('pointerdown', () => isDraggingCam = true);
canvas.addEventListener('pointerdown', (e) => {
  if (engineState !== 'INTERACTIVE') return;

  // First, check if we clicked a social icon
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(linkItems);

  if (intersects.length > 0) {
    window.open(intersects[0].object.userData.url, '_blank');
  } else {
    // If we missed the icons, start dragging the camera
    isDraggingCam = true;
  }
});
window.addEventListener('pointerup', () => isDraggingCam = false);
window.addEventListener('pointermove', (e) => {
  if (!isDraggingCam || engineState !== 'INTERACTIVE') return;
  camYaw -= e.movementX * 0.005;
  camPitch = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, camPitch - e.movementY * 0.005));
});

// Chat Logic
const chatInput = document.getElementById('chat-input');
document.getElementById('chat-send').addEventListener('click', () => {
  if (chatInput.value.trim()) { localPlayer.say(chatInput.value.trim()); chatInput.value = ''; }
});
chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') document.getElementById('chat-send').click(); });

// Network Simulator
function spawnNetworkEvent() {
  const remoteId = 'remote_' + Math.floor(Math.random() * 9000);
  const remotePlayer = new Player(remoteId, scene, uiLayer, false, 'mecha');
  remotePlayer.mesh.position.set(-8, 0, -5);
  remotePlayer.targetPos.set(-8, 0, -5);
  players.set(remoteId, remotePlayer);

  setTimeout(() => remotePlayer.say('Nice avatar selection.'), 1000);
  setTimeout(() => remotePlayer.targetPos.set(0, 0, -8), 3500); 
}

// --- RENDER PIPELINE ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  const time = Date.now() * 0.003;

  if (engineState === 'INTRO') {
    camera.position.set(0, 40, 30);
    camera.lookAt(0, 0, 0);
  } 
  else if (engineState === 'SELECT') {
    camera.position.lerp(new THREE.Vector3(0, 16.5, 6), 0.05);
    camera.lookAt(0, 15.5, 0);
    if (localPlayer) localPlayer.playShowcaseAnimation(time);
  } 
  else if (engineState === 'WARPING') {
    const idealOffset = new THREE.Vector3(0, 4, 8);
    camera.position.lerp(idealOffset, 0.04);
    camera.lookAt(0, 1, 0);

    if (camera.position.distanceTo(idealOffset) < 0.5) {
      engineState = 'INTERACTIVE';
      chatInterface.classList.add('hud-element', 'unlocked');
      mobileJumpBtn.classList.add('unlocked');
      joystickZone.classList.add('unlocked');
      setTimeout(spawnNetworkEvent, 1500);
    }
  } 
  else if (engineState === 'INTERACTIVE') {
    // Kinematics Math
    let inputX = joyDelta.x, inputY = joyDelta.y; 
    if (keys.a) inputX = -1; if (keys.d) inputX = 1;
    if (keys.w) inputY = -1; if (keys.s) inputY = 1;

    const isMoving = (inputX !== 0 || inputY !== 0);

    if (isMoving) {
      const moveAngle = Math.atan2(inputX, inputY) + camYaw;
      const targetQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), moveAngle);
      localPlayer.mesh.quaternion.slerp(targetQuat, 0.2);
      
      const forward = new THREE.Vector3(0,0,1).applyQuaternion(localPlayer.mesh.quaternion);
      localPlayer.mesh.position.addScaledVector(forward, 0.15);
    }

    const idealCamPos = new THREE.Vector3(
      localPlayer.mesh.position.x + Math.sin(camYaw) * Math.cos(camPitch) * camDistance,
      localPlayer.mesh.position.y + Math.sin(camPitch) * camDistance,
      localPlayer.mesh.position.z + Math.cos(camYaw) * Math.cos(camPitch) * camDistance
    );
    camera.position.lerp(idealCamPos, 0.15);
    camera.lookAt(localPlayer.mesh.position.x, localPlayer.mesh.position.y + 1.0, localPlayer.mesh.position.z);
    
    localPlayer.updateAnimation(time, isMoving);

    // Make social relics always face the camera
    linkItems.forEach((relic, i) => {
      relic.lookAt(camera.position);
      relic.position.y = relic.userData.baseY + Math.sin(time * 2 + i) * 0.15;
    });
  }

  players.forEach((player) => {
    if (player.id !== localPlayer?.id) {
      player.mesh.position.lerp(player.targetPos, 0.05);
      player.updateAnimation(time, player.mesh.position.distanceTo(player.targetPos) > 0.02);
    }
    player.updateSpatialUI(camera);
  });

  renderer.render(scene, camera);
}

animate();
