import * as THREE from 'three';
import { Player } from './player.js';
import { triggerAtmosphereSwell } from './audio.js';

let engineState = 'INTRO';

// Scene & Camera
const canvas = document.querySelector('#webgl');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x020205, 0.035);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 40, 30);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Environment Lighting & Floor Grid
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dirLight = new THREE.DirectionalLight(0xa855f7, 2);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

const grid = new THREE.GridHelper(100, 100, 0x1e1b4b, 0x0f172a);
scene.add(grid);

// Entities
const uiLayer = document.getElementById('ui-layer');
const players = new Map();
const localPlayer = new Player('local_' + Math.floor(Math.random() * 1000), scene, uiLayer, true);
players.set(localPlayer.id, localPlayer);

// Input Handlers
const keys = { w: false, a: false, s: false, d: false };
window.addEventListener('keydown', (e) => {
  if (document.activeElement === document.getElementById('chat-input') || engineState !== 'INTERACTIVE') return;
  if (keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = true;
});
window.addEventListener('keyup', (e) => {
  if (keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = false;
});

// UI & Intro State Hook
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
  remotePlayer.mesh.position.set(10, 0, 10);
  remotePlayer.targetPos.set(10, 0, 10);
  players.set(remoteId, remotePlayer);

  setTimeout(() => remotePlayer.say('Connection established.'), 1000);
  setTimeout(() => remotePlayer.targetPos.set(3, 0, -3), 2000);
}

// Chat Listeners
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

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render Loop
function animate() {
  requestAnimationFrame(animate);

  if (engineState === 'WARPING') {
    const idealOffset = new THREE.Vector3(0, 4, -8).applyQuaternion(localPlayer.mesh.quaternion).add(localPlayer.mesh.position);
    camera.position.lerp(idealOffset, 0.035);

    const lookTarget = localPlayer.mesh.position.clone();
    lookTarget.y += 1.5;
    camera.lookAt(lookTarget);

    if (camera.position.distanceTo(idealOffset) < 0.5) {
      engineState = 'INTERACTIVE';
      chatInterface.classList.add('unlocked');
      setTimeout(spawnNetworkEvent, 1500);
    }
  } else if (engineState === 'INTERACTIVE') {
    if (keys.a) localPlayer.mesh.rotation.y += 0.05;
    if (keys.d) localPlayer.mesh.rotation.y -= 0.05;

    const direction = new THREE.Vector3();
    localPlayer.mesh.getWorldDirection(direction);
    if (keys.w) localPlayer.mesh.position.addScaledVector(direction, 0.15);
    if (keys.s) localPlayer.mesh.position.addScaledVector(direction, -0.15);

    const idealOffset = new THREE.Vector3(0, 4, -8).applyQuaternion(localPlayer.mesh.quaternion).add(localPlayer.mesh.position);
    camera.position.lerp(idealOffset, 0.1);

    const lookTarget = localPlayer.mesh.position.clone();
    lookTarget.y += 1.5;
    camera.lookAt(lookTarget);
  }

  players.forEach((player) => {
    player.mesh.update(camera);
    player.updateSpatialUI(camera);

    if (!player.isLocal) {
      player.mesh.position.lerp(player.targetPos, 0.05);
      player.mesh.lookAt(localPlayer.mesh.position.x, player.mesh.position.y, localPlayer.mesh.position.z);
    }
  });

  renderer.render(scene, camera);
}

animate();
