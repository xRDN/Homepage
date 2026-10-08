import * as THREE from 'three';
import { Player } from './player.js';
import { triggerAtmosphereSwell } from './audio.js';

let engineState = 'INTRO';

// --- CORE SETUP ---
const canvas = document.querySelector('#webgl');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a0a0f, 0.04); // Dark, dusty atmosphere

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 40, 30);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// --- BUILD THE UNDERGROUND BUNKER APARTMENT ---
function buildBunker() {
  const bunkerGroup = new THREE.Group();
  
  // Materials
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x1f1f24, roughness: 0.9, metalness: 0.1 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5, metalness: 0.9 });
  const screenMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x06b6d4, emissiveIntensity: 1.2 });
  const fabricMat = new THREE.MeshStandardMaterial({ color: 0x4f46e5, roughness: 1.0 }); // Purple bed

  // Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), concreteMat);
  floor.rotation.x = -Math.PI / 2;
  bunkerGroup.add(floor);

  // Structural Pillars
  const pillarGeo = new THREE.BoxGeometry(1.5, 6, 1.5);
  const positions = [ [-10, -10], [10, -10], [-10, 10], [10, 10] ];
  positions.forEach(pos => {
    const pillar = new THREE.Mesh(pillarGeo, concreteMat);
    pillar.position.set(pos[0], 3, pos[1]);
    bunkerGroup.add(pillar);
  });

  // Elevated Bed Area
  const platform = new THREE.Mesh(new THREE.BoxGeometry(8, 0.5, 6), darkMetal);
  platform.position.set(-12, 0.25, -10);
  const bed = new THREE.Mesh(new THREE.BoxGeometry(4, 0.8, 5), fabricMat);
  bed.position.set(-13, 0.9, -10);
  bunkerGroup.add(platform, bed);

  // Hacker Desk Area
  const desk = new THREE.Mesh(new THREE.BoxGeometry(6, 0.2, 2), darkMetal);
  desk.position.set(10, 1.5, -12);
  
  const screen1 = new THREE.Mesh(new THREE.BoxGeometry(2, 1.2, 0.1), screenMat);
  screen1.position.set(9, 2.5, -12.5);
  screen1.rotation.y = 0.2;
  
  const screen2 = new THREE.Mesh(new THREE.BoxGeometry(2, 1.2, 0.1), screenMat);
  screen2.position.set(11.2, 2.5, -12.2);
  screen2.rotation.y = -0.3;

  bunkerGroup.add(desk, screen1, screen2);

  // Perimeter Walls (Low-poly abstraction)
  const wallGeo = new THREE.BoxGeometry(40, 6, 1);
  const wallN = new THREE.Mesh(wallGeo, concreteMat); wallN.position.set(0, 3, -15);
  const wallS = new THREE.Mesh(wallGeo, concreteMat); wallS.position.set(0, 3, 15);
  const wallE = new THREE.Mesh(wallGeo, concreteMat); wallE.position.set(15, 3, 0); wallE.rotation.y = Math.PI / 2;
  const wallW = new THREE.Mesh(wallGeo, concreteMat); wallW.position.set(-15, 3, 0); wallW.rotation.y = Math.PI / 2;
  bunkerGroup.add(wallN, wallS, wallE, wallW);

  scene.add(bunkerGroup);

  // Lighting the Bunker
  scene.add(new THREE.AmbientLight(0x0a0a0f, 1.5)); // Very dark ambient
  
  // Central warm incandescent light
  const mainLight = new THREE.PointLight(0xffaa55, 100, 30, 1.5);
  mainLight.position.set(0, 5, 0);
  scene.add(mainLight);

  // Cold cyan light spilling from the hacker desk
  const deskLight = new THREE.PointLight(0x06b6d4, 80, 15, 1.5);
  deskLight.position.set(10, 3, -10);
  scene.add(deskLight);
}

buildBunker();

// --- ENTITIES ---
const uiLayer = document.getElementById('ui-layer');
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
  // Spawn friend near the desk
  remotePlayer.mesh.position.set(8, 0, -8);
  remotePlayer.targetPos.set(8, 0, -8);
  players.set(remoteId, remotePlayer);

  setTimeout(() => remotePlayer.say('Nice bunker layout.'), 1000);
  setTimeout(() => remotePlayer.targetPos.set(5, 0, -5), 3000);
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

  if (engineState === 'WARPING') {
    // Tighter camera offset for indoors
    const idealOffset = new THREE.Vector3(0, 3, -6).applyQuaternion(localPlayer.mesh.quaternion).add(localPlayer.mesh.position);
    camera.position.lerp(idealOffset, 0.035);

    const lookTarget = localPlayer.mesh.position.clone();
    lookTarget.y += 1.0;
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

    // Tighter 3rd Person Follow for the bunker
    const idealOffset = new THREE.Vector3(0, 3, -6).applyQuaternion(localPlayer.mesh.quaternion).add(localPlayer.mesh.position);
    camera.position.lerp(idealOffset, 0.1);

    const lookTarget = localPlayer.mesh.position.clone();
    lookTarget.y += 1.0;
    camera.lookAt(lookTarget);
  }

  // Float animation for hands
  const time = Date.now() * 0.003;

  players.forEach((player) => {
    player.mesh.update(camera);
    player.updateSpatialUI(camera);

    // Jumping and squashing animation for the slime
    const slimeCore = player.mesh.levels[0].object.getObjectByName("slimeCore");
    
    if (slimeCore) {
      // 1. Calculate absolute sine wave for continuous hopping
      const jumpTrajectory = Math.abs(Math.sin(time * 1.5));
      slimeCore.position.y = jumpTrajectory * 0.7; // Jump height

      // 2. Base aerodynamic stretch (taller at peak jump)
      const stretch = 1 + jumpTrajectory * 0.2; 
      const squash = 1 - jumpTrajectory * 0.1;
      
      // 3. Ground impact squish (triggers only when near the floor)
      let impact = 0;
      if (jumpTrajectory < 0.2) {
        impact = (0.2 - jumpTrajectory) * 2.0;
      }

      // Apply dimensional scaling
      slimeCore.scale.set(
        squash + impact,       // X swells on impact
        stretch - impact,      // Y compresses on impact
        squash + impact        // Z swells on impact
      );
    }

    if (!player.isLocal) {
      player.mesh.position.lerp(player.targetPos, 0.05);
      player.mesh.lookAt(localPlayer.mesh.position.x, player.mesh.position.y, localPlayer.mesh.position.z);
    }
  });

  renderer.render(scene, camera);
}

animate();
