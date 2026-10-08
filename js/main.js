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

// Cardboard Display Stand
const cardboard = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 2), cardboardMat);
cardboard.position.set(0, 1.5, -12);
cardboard.rotation.y = -0.15;
bunkerGroup.add(cardboard);

// --- NEW: 3D INTERACTIVE SOCIAL RELICS ---
const linkItems = [];

function createSocialRelic(geometry, color, url, xOffset) {
  const material = new THREE.MeshStandardMaterial({
    color: color,
    emissive: color,
    emissiveIntensity: 0.4,
    roughness: 0.2,
    metalness: 0.8
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  
  // Attach metadata for the raycaster
  mesh.userData = { 
    url: url, 
    baseY: 4.0, // Floating height
    hovered: false 
  };
  
  // Position above the cardboard stand
  mesh.position.set(xOffset, 4.0, -12);
  
  // Add a protective holographic ring
  const ringGeo = new THREE.TorusGeometry(0.7, 0.03, 16, 32);
  const ringMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.5 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  mesh.add(ring);

  bunkerGroup.add(mesh);
  linkItems.push(mesh);
  return mesh;
}

// 1. LinkedIn (Blue Cube)
createSocialRelic(new THREE.BoxGeometry(0.7, 0.7, 0.7), 0x0a66c2, 'https://linkedin.com', -2.5);

// 2. GitHub (Dark Sphere)
createSocialRelic(new THREE.SphereGeometry(0.45, 32, 32), 0x24292e, 'https://github.com', 0);

// 3. X.com (Black Diamond/Octahedron)
createSocialRelic(new THREE.OctahedronGeometry(0.5, 0), 0x000000, 'https://x.com', 2.5);

// --- RAYCASTING (3D CLICK DETECTION) ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredMesh = null;

// Handle Hover Effects (Desktop)
canvas.addEventListener('pointermove', (e) => {
  if (engineState !== 'INTERACTIVE') return;

  // Convert mouse position to normalized device coordinates (-1 to +1)
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(linkItems);

  if (intersects.length > 0) {
    const object = intersects[0].object;
    if (hoveredMesh !== object) {
      // Revert previous hover
      if (hoveredMesh) resetHover(hoveredMesh);
      // Apply new hover
      hoveredMesh = object;
      document.body.style.cursor = 'pointer';
      hoveredMesh.material.emissiveIntensity = 2.0; // Glow intensely
      hoveredMesh.scale.set(1.2, 1.2, 1.2);       // Scale up
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
  mesh.material.emissiveIntensity = 0.4;
  mesh.scale.set(1, 1, 1);
}

// Handle Clicks/Taps (Desktop & Mobile)
canvas.addEventListener('pointerdown', (e) => {
  if (engineState !== 'INTERACTIVE') return;

  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(linkItems);
  if (intersects.length > 0) {
    window.open(intersects[0].object.userData.url, '_blank');
  }
});

// --- UI LAYERS ---
const uiLayer = document.getElementById('ui-layer');

const mobileJumpBtn = document.createElement('div');
mobileJumpBtn.style.cssText = `position: fixed; bottom: 2rem; right: 2rem; z-index: 25; opacity: 0; pointer-events: none; transition: opacity 1s ease;`;
mobileJumpBtn.innerHTML = `
  <button id="action-jump" style="background: rgba(15,23,42,0.8); color: #ffffff; width: 70px; height: 70px; border-radius: 50%; border: 3px solid #38bdf8; font-weight: 900; font-size: 14px; box-shadow: 0 8px 20px rgba(0,0,0,0.3); cursor: pointer; user-select: none; touch-action: manipulation; backdrop-filter: blur(4px);">JUMP</button>
`;
document.body.appendChild(mobileJumpBtn);

const joystickZone = document.createElement('div');
joystickZone.style.cssText = `position: fixed; bottom: 2rem; left: 2rem; width: 120px; height: 120px; background: rgba(15, 23, 42, 0.3); border-radius: 50%; border: 2px solid rgba(56, 189, 248, 0.5); z-index: 25; touch-action: none; display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 1s; backdrop-filter: blur(4px);`;

const joystickKnob = document.createElement('div');
joystickKnob.style.cssText = `width: 50px; height: 50px; background: rgba(56, 189, 248, 0.8); border-radius: 50%; box-shadow: 0 4px 10px rgba(0,0,0,0.5); pointer-events: none; transform: translate(0px, 0px);`;

joystickZone.appendChild(joystickKnob);
document.body.appendChild(joystickZone);

// --- ENTITIES ---
const players = new Map();
const localPlayer = new Player('local_' + Math.floor(Math.random() * 1000), scene, uiLayer, true);
players.set(localPlayer.id, localPlayer);

// --- INPUT & CONTROLS ---
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
let joyOrigin = { x: 0, y: 0 };
let joyDelta = { x: 0, y: 0 };

joystickZone.addEventListener('pointerdown', (e) => {
  e.stopPropagation(); // Prevents joystick touches from triggering Raycaster clicks
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
  
  if (dist > maxDist) {
    dx = (dx / dist) * maxDist;
    dy = (dy / dist) * maxDist;
  }
  
  joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
  joyDelta.x = dx / maxDist;
  joyDelta.y = dy / maxDist;
}

// --- TRANSITIONS ---
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

  setTimeout(() => remotePlayer.say('Click those 3D shapes to open links.'), 1000);
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
      mobileJumpBtn.style.opacity = '1';
      mobileJumpBtn.style.pointerEvents = 'auto';
      joystickZone.style.opacity = '1';
      joystickZone.style.pointerEvents = 'auto';
      setTimeout(spawnNetworkEvent, 1500);
    }
  } else if (engineState === 'INTERACTIVE') {
    let rotVelocity = 0;
    let moveVelocity = 0;

    if (keys.a) rotVelocity += 0.05;
    if (keys.d) rotVelocity -= 0.05;
    if (keys.w) moveVelocity += 0.2;
    if (keys.s) moveVelocity -= 0.2;

    rotVelocity -= joyDelta.x * 0.05;
    moveVelocity -= joyDelta.y * 0.2;

    localPlayer.mesh.rotation.y += rotVelocity;
    const direction = new THREE.Vector3();
    localPlayer.mesh.getWorldDirection(direction);
    localPlayer.mesh.position.addScaledVector(direction, moveVelocity);

    const idealOffset = new THREE.Vector3(0, 3, -7).applyQuaternion(localPlayer.mesh.quaternion).add(localPlayer.mesh.position);
    camera.position.lerp(idealOffset, 0.1);

    const lookTarget = localPlayer.mesh.position.clone();
    lookTarget.y += 1.0;
    camera.lookAt(lookTarget);
  }

  // Animate the 3D Social Relics
  linkItems.forEach((relic, i) => {
    relic.rotation.y += 0.02;
    relic.rotation.x += 0.01;
    // Add a gentle floating bob
    relic.position.y = relic.userData.baseY + Math.sin(time * 2 + i) * 0.2;
  });

  proj1Holo.rotation.x = time * 0.2;
  proj1Holo.rotation.y = time * 0.4;
  proj2Holo.rotation.x = -time * 0.3;
  proj2Holo.rotation.y = time * 0.5;

  players.forEach((player) => {
    player.mesh.update(camera);
    player.updateSpatialUI(camera);

    const slimeCore = player.mesh.levels[0].object.getObjectByName("slimeCore");
    if (slimeCore) {
      const isLocalMoving = (player.isLocal) && (keys.w || keys.s || keys.a || keys.d || joyDelta.x !== 0 || joyDelta.y !== 0);
      const isRemoteMoving = (!player.isLocal) && (player.mesh.position.distanceTo(player.targetPos) > 0.02);

      if (player.isJumping) {
        player.animTime += 0.12;     
        player.jumpIntensity = 2.0;  
        if (player.animTime >= Math.PI) {
          player.animTime = 0;       
          player.isJumping = false;
        }
      } else if (isLocalMoving || isRemoteMoving) {
        player.animTime += 0.25;     
        player.jumpIntensity = 0.5;  
      } else {
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
