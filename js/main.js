import * as THREE from 'three';
import { Player } from './player.js';
import { triggerAtmosphereSwell } from './audio.js';

let engineState = 'INTRO';
let selectedChar = 'slime';

// Character Selection UI
document.querySelectorAll('.char-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.char-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    selectedChar = e.target.dataset.type;
  });
});

const canvas = document.querySelector('#webgl');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf8fafc); 
scene.fog = new THREE.FogExp2(0xf8fafc, 0.012); 

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(0, 40, 30);
camera.lookAt(0, 0, 0);

// --- FREE-LOOK CAMERA RIG ---
let camYaw = Math.PI; // Look direction (horizontal)
let camPitch = 0.5;   // Look elevation (vertical)
let camDistance = 8;
let isDraggingCam = false;

// Right-Half Screen Camera Drag (Mobile & Desktop)
const camZone = document.getElementById('camera-zone');
camZone.addEventListener('pointerdown', () => isDraggingCam = true);
window.addEventListener('pointerup', () => isDraggingCam = false);
window.addEventListener('pointermove', (e) => {
  if (!isDraggingCam || engineState !== 'INTERACTIVE') return;
  camYaw -= e.movementX * 0.005;
  camPitch -= e.movementY * 0.005;
  camPitch = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, camPitch)); // Clamp pitch
});
// Allow desktop to drag anywhere if not clicking UI
canvas.addEventListener('pointerdown', () => isDraggingCam = true);

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

const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), concreteMat);
floor.rotation.x = -Math.PI / 2;
bunkerGroup.add(floor);

scene.add(new THREE.AmbientLight(0xffffff, 2.5));
scene.add(new THREE.HemisphereLight(0xffffff, 0xe2e8f0, 2.0));
const sunLight = new THREE.DirectionalLight(0xfffbeb, 3.0);
sunLight.position.set(20, 30, 20);
scene.add(sunLight);

// --- UI INJECTION ---
const uiLayer = document.getElementById('ui-layer');

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

// --- ENTITIES ---
const players = new Map();
let localPlayer;

// --- INPUT LOGIC ---
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

let joyActive = false;
let joyDelta = { x: 0, y: 0 };
let joyOrigin = { x: 0, y: 0 };

joystickZone.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  joyActive = true;
  const rect = joystickZone.getBoundingClientRect();
  joyOrigin.x = rect.left + rect.width / 2;
  joyOrigin.y = rect.top + rect.height / 2;
  updateJoystick(e);
});

window.addEventListener('pointermove', (e) => {
  if (!joyActive) return;
  updateJoystick(e);
});

window.addEventListener('pointerup', () => {
  joyActive = false;
  joyDelta = { x: 0, y: 0 };
  joystickKnob.style.transform = `translate(0px, 0px)`;
});

function updateJoystick(e) {
  let dx = e.clientX - joyOrigin.x;
  let dy = e.clientY - joyOrigin.y;
  const maxDist = 35; 
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > maxDist) { dx = (dx/dist)*maxDist; dy = (dy/dist)*maxDist; }
  joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
  joyDelta.x = dx / maxDist;
  joyDelta.y = dy / maxDist; // Negative is forward
}

// --- TRANSITIONS ---
const introScreen = document.getElementById('intro-screen');
const chatInterface = document.getElementById('chat-interface');

document.getElementById('btn-deploy').addEventListener('pointerdown', () => {
  if (engineState !== 'INTRO') return;
  
  // Initialize player with selected character
  localPlayer = new Player('local_' + Math.floor(Math.random() * 1000), scene, uiLayer, true, selectedChar);
  players.set(localPlayer.id, localPlayer);

  engineState = 'WARPING';
  introScreen.classList.add('hidden');
  triggerAtmosphereSwell();
});

const chatInput = document.getElementById('chat-input');
document.getElementById('chat-send').addEventListener('click', () => {
  if (chatInput.value.trim()) { localPlayer.say(chatInput.value.trim()); chatInput.value = ''; }
});
chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') document.getElementById('chat-send').click(); });

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
    const idealOffset = new THREE.Vector3(0, 4, 8);
    camera.position.lerp(idealOffset, 0.035);
    camera.lookAt(0, 1, 0);

    if (camera.position.distanceTo(idealOffset) < 0.5) {
      engineState = 'INTERACTIVE';
      // Trigger CSS Unlock Animations
      chatInterface.classList.add('hud-element', 'unlocked');
      mobileJumpBtn.classList.add('unlocked');
      joystickZone.classList.add('unlocked');
    }
  } else if (engineState === 'INTERACTIVE') {
    
    // --- DIRECTIONAL MOVEMENT RELATIVE TO CAMERA ---
    let inputX = joyDelta.x;
    let inputY = joyDelta.y; 
    
    if (keys.a) inputX = -1;
    if (keys.d) inputX = 1;
    if (keys.w) inputY = -1;
    if (keys.s) inputY = 1;

    const isMoving = (inputX !== 0 || inputY !== 0);

    if (isMoving) {
      // Calculate target angle based on camera yaw
      const moveAngle = Math.atan2(inputX, inputY) + camYaw;
      
      // Smoothly rotate player mesh to face movement direction
      const targetQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), moveAngle);
      localPlayer.mesh.quaternion.slerp(targetQuat, 0.2);

      // Move forward along the character's new local Z axis
      const forward = new THREE.Vector3(0,0,1).applyQuaternion(localPlayer.mesh.quaternion);
      localPlayer.mesh.position.addScaledVector(forward, 0.15);
    }

    // --- FREE-LOOK ORBIT CAMERA ---
    // Calculate ideal camera position based on Yaw/Pitch dragging
    const idealCamPos = new THREE.Vector3(
      localPlayer.mesh.position.x + Math.sin(camYaw) * Math.cos(camPitch) * camDistance,
      localPlayer.mesh.position.y + Math.sin(camPitch) * camDistance,
      localPlayer.mesh.position.z + Math.cos(camYaw) * Math.cos(camPitch) * camDistance
    );

    camera.position.lerp(idealCamPos, 0.15);
    camera.lookAt(localPlayer.mesh.position.x, localPlayer.mesh.position.y + 1.0, localPlayer.mesh.position.z);
    
    localPlayer.updateAnimation(time, isMoving);
  }

  players.forEach((player) => {
    player.updateSpatialUI(camera);
    if (!player.isLocal) {
      player.mesh.position.lerp(player.targetPos, 0.05);
      player.updateAnimation(time, player.mesh.position.distanceTo(player.targetPos) > 0.02);
    }
  });

  renderer.render(scene, camera);
}

animate();
