import * as THREE from 'three';

// ---- edit me ----
const LINKS = [
  { label: 'GitHub',   emoji: '🐙', url: 'https://github.com/',   color: '#4a6fa5' },
  { label: 'LinkedIn', emoji: '💼', url: 'https://linkedin.com/', color: '#2f7fc1' },
  { label: 'X',        emoji: '🐦', url: 'https://x.com/',        color: '#3b4a54' },
];
const PROJECTS = [
  { emoji: '🧩', name: 'Project One',   desc: 'One line on what it does and why it is neat.', tags: ['JavaScript', 'WebGL'], url: 'https://github.com/' },
  { emoji: '🛠️', name: 'Project Two',   desc: 'A tool that saves somebody a boring hour.',    tags: ['Python', 'CLI'],       url: 'https://github.com/' },
  { emoji: '🌱', name: 'Project Three', desc: 'Something small, new, and growing.',           tags: ['Rust'],                url: 'https://github.com/' },
];
const NPC_LINES = ['Hi! Welcome 🌸', 'Check out the projects!', 'Nice island, huh?', 'Boing boing~', 'Try N and T!'];
// -----------------

const $ = s => document.querySelector(s);
const V = THREE.Vector3;
const M = (c, r = .7) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

// ---- world moods: [day|night][warm|cold] ----
const P = {
  dw: { sky: 0x8ecdf0, hs: 0xffffff, hg: 0xd8c9a0, hi: 1.5, sun: 0xfff1cf, si: 2.4, grass: 0x8fcf6b, dirt: 0xc79a6b, water: 0x62c0e8, leaf: 0x58b04d, cloud: 0xffffff },
  dc: { sky: 0xc3d8e6, hs: 0xeaf3ff, hg: 0xb9c7cf, hi: 1.6, sun: 0xe6f0ff, si: 1.9, grass: 0xa9cbb6, dirt: 0xa69886, water: 0x9fcfe6, leaf: 0x5f9a85, cloud: 0xf2f6fa },
  nw: { sky: 0x2b2a4a, hs: 0x9a90d0, hg: 0x3a2a30, hi: 1.0, sun: 0xffd9a0, si: 1.3, grass: 0x4f7a47, dirt: 0x6b5340, water: 0x3b6ea0, leaf: 0x3f7a40, cloud: 0x6f7396 },
  nc: { sky: 0x10213d, hs: 0x7fa6e8, hg: 0x1c2a3f, hi: 1.0, sun: 0xbfd4ff, si: 1.4, grass: 0x41705f, dirt: 0x4a4f5c, water: 0x2f5f9a, leaf: 0x336a63, cloud: 0x5b6a8a },
};
const CK = ['sky', 'hs', 'hg', 'sun', 'grass', 'dirt', 'water', 'leaf', 'cloud'];
let night = (h => h < 6 || h >= 19)(new Date().getHours()), cold = false;
const key = () => (night ? 'n' : 'd') + (cold ? 'c' : 'w');
const cur = { hi: P[key()].hi, si: P[key()].si };
CK.forEach(k => cur[k] = new THREE.Color(P[key()][k]));
let phase = .45 + (night ? Math.PI : 0), phaseT = phase, nightMix = night ? 1 : 0;
const syncMood = () => { $('#b-tod').textContent = night ? '🌙 Night' : '☀️ Day'; $('#b-temp').textContent = cold ? '❄️ Cold' : '🔥 Warm'; };
const toggleTod = () => { night = !night; phaseT += Math.PI; syncMood(); };
const toggleTemp = () => { cold = !cold; syncMood(); };
$('#b-tod').onclick = e => { toggleTod(); e.currentTarget.blur(); };
$('#b-temp').onclick = e => { toggleTemp(); e.currentTarget.blur(); };
syncMood();

const canvas = $('#webgl');
const scene = new THREE.Scene();
scene.background = cur.sky;
scene.fog = new THREE.Fog(cur.sky.clone(), 35, 90);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, .1, 200);
camera.position.set(0, 9, 30);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 1.5);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, far: 70 });
scene.add(sun);

function mk(geo, mat, pos = [0, 0, 0], parent = scene) {
  const o = new THREE.Mesh(geo, mat);
  o.position.set(...pos);
  o.castShadow = o.receiveShadow = true;
  parent.add(o);
  return o;
}
const cyl = (a, b, h, s = 32) => new THREE.CylinderGeometry(a, b, h, s);
const sph = (r, w = 20, h = 14) => new THREE.SphereGeometry(r, w, h);
function tex(draw) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  draw(c.getContext('2d'));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---- sun, moon, stars ----
const body = (map, size) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, fog: false, transparent: true, depthWrite: false }));
  s.scale.setScalar(size); scene.add(s); return s;
};
const sunS = body(tex(g => {
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, '#fffbe0'); r.addColorStop(.22, '#fff3b0'); r.addColorStop(.28, 'rgba(255,230,140,.55)'); r.addColorStop(1, 'rgba(255,230,140,0)');
  g.fillStyle = r; g.fillRect(0, 0, 256, 256);
}), 46);
const moonS = body(tex(g => {
  const r = g.createRadialGradient(128, 128, 40, 128, 128, 128);
  r.addColorStop(0, 'rgba(220,230,255,.5)'); r.addColorStop(1, 'rgba(220,230,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#f4f6ff'; g.beginPath(); g.arc(128, 128, 56, 0, 7); g.fill();
  g.fillStyle = 'rgba(160,172,205,.45)';
  [[105, 110, 12], [146, 140, 16], [120, 152, 9], [150, 104, 8]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); });
}), 28);
const sg = [];
for (let i = 0; i < 260; i++) { const a = rand(0, 6.283), e = rand(.05, 1.3); sg.push(Math.cos(a) * Math.cos(e) * 85, Math.sin(e) * 85, Math.sin(a) * Math.cos(e) * 85); }
const starGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(sg, 3));
const starM = new THREE.PointsMaterial({ color: 0xffffff, size: 1.4, transparent: true, opacity: 0, fog: false, depthWrite: false });
const stars = new THREE.Points(starGeo, starM); stars.frustumCulled = false; scene.add(stars);

// ---- snow (cold) / fireflies (warm night) ----
const N = 240, pa = new Float32Array(N * 3), seed = new Float32Array(N);
for (let i = 0; i < N; i++) { pa[i * 3] = rand(-22, 22); pa[i * 3 + 1] = rand(.4, 14); pa[i * 3 + 2] = rand(-22, 22); seed[i] = rand(0, 6.28); }
const pGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pa, 3));
const pMat = new THREE.PointsMaterial({ size: .16, transparent: true, opacity: 0, depthWrite: false, color: 0xffffff });
const parts = new THREE.Points(pGeo, pMat); parts.frustumCulled = false; scene.add(parts);

// ---- island ----
const obstacles = []; // [x, z, radius]
const grassM = M(0xffffff, .9), dirtM = M(0xffffff, .95), waterM = M(0xffffff, .2), cloudM = M(0xffffff, 1);
const leafM = [M(0xffffff), M(0xffffff), M(0xffffff)];
mk(cyl(14, 14, 1, 64), grassM, [0, -.5, 0]);
mk(cyl(14.2, 8, 4, 64), dirtM, [0, -3, 0]);
mk(cyl(2.6, 2.6, .05, 48), waterM, [-7, .03, 5]);

function tree(x, z, s, m) {
  mk(cyl(.15 * s, .22 * s, 1.2 * s, 10), M(0x8a6444), [x, .6 * s, z]);
  mk(sph(1.1 * s), leafM[m], [x, 1.9 * s, z]);
  mk(sph(.7 * s), leafM[m], [x + .6 * s, 1.5 * s, z + .3 * s]);
  obstacles.push([x, z, .6 * s]);
}
tree(-10, -3, 1.1, 0); tree(10, -2, 1, 1); tree(-9, -10, .9, 2);
tree(9, 6, 1.2, 0); tree(2, 10, .9, 1); tree(-3, 11, 1, 2);

const petals = [0xffffff, 0xffd36e, 0xc7a8ff, 0xff7a6b];
for (let i = 0; i < 40; i++) {
  const a = rand(0, 6.28), r = rand(4, 12.5), x = Math.cos(a) * r, z = Math.sin(a) * r;
  if ((z < -5.5 && Math.abs(x) < 8) || Math.hypot(x + 6.5, z + 3.5) < 2.5) continue;
  mk(sph(.16, 10, 8), M(petals[i % 4], .9), [x, .16, z]);
}
const clouds = new THREE.Group(); scene.add(clouds);
for (let i = 0; i < 7; i++) {
  const c = new THREE.Group(), a = i * .9, r = rand(22, 40);
  for (let j = 0; j < 3; j++) { const b = new THREE.Mesh(sph(rand(1.6, 2.6), 16, 12), cloudM); b.position.set(j * 2 - 2, rand(-.3, .5), 0); c.add(b); }
  c.position.set(Math.cos(a) * r, rand(7, 14), Math.sin(a) * r);
  clouds.add(c);
}

// ---- signs: links + project board ----
function badge(l) {
  return tex(g => {
    g.fillStyle = l.color; g.beginPath(); g.roundRect(16, 16, 224, 224, 64); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center';
    g.font = '100px serif'; g.fillText(l.emoji, 128, 140);
    g.font = 'bold 34px ui-rounded, system-ui, sans-serif'; g.fillText(l.label, 128, 207);
  });
}
const SPOTS = [
  ...LINKS.map((l, i) => ({ ...l, x: (i - (LINKS.length - 1) / 2) * 5.2, z: -9 })),
  { label: 'Projects', emoji: '🗂️', color: '#4f9d69', x: -6.5, z: -3.5, panel: true },
];
const stations = SPOTS.map(l => {
  mk(cyl(1.1, 1.3, .7), M(0xefe3c8), [l.x, .35, l.z]);
  mk(new THREE.TorusGeometry(1.15, .09, 12, 40), M(l.color), [l.x, .72, l.z]).rotation.x = Math.PI / 2;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9), new THREE.MeshBasicMaterial({ map: badge(l), transparent: true, side: THREE.DoubleSide }));
  sign.position.set(l.x, 2.4, l.z); scene.add(sign);
  obstacles.push([l.x, l.z, 1.4]);
  return { ...l, sign, hover: false };
});

// ---- projects panel ----
let panelOpen = false;
const panel = $('#projects');
$('#plist').innerHTML = PROJECTS.map(p => `<a class="proj" href="${p.url}" target="_blank" rel="noopener"><b>${p.emoji}</b><div><h3>${p.name}</h3><p>${p.desc}</p>${p.tags.map(t => `<i>${t}</i>`).join('')}</div><em>↗</em></a>`).join('');
function openPanel() { panelOpen = true; panel.classList.remove('hidden'); $('#px').focus(); }
function closePanel() { panelOpen = false; panel.classList.add('hidden'); }
$('#px').onclick = closePanel;
panel.addEventListener('pointerdown', e => { if (e.target === panel) closePanel(); });
const open = s => s.panel ? openPanel() : window.open(s.url, '_blank', 'noopener');
$('#links').innerHTML = LINKS.map(l => `<a href="${l.url}" target="_blank" rel="noopener">${l.emoji} ${l.label}</a>`).join('') + '<button id="nav-proj">🗂️ Projects</button>';
$('#nav-proj').onclick = openPanel;

// ---- characters ----
const KINDS = {
  slime: { k: 's', c: 0x4fc4b0 },
  mochi: { k: 's', c: 0xffa6c9, ears: 1, blush: 0xf0568f },
  bot:   { k: 'b', c: 0xe8eef2, glow: 0x6ff3ff },
  pip:   { k: 'b', c: 0xffc2d9, glow: 0xff7fb0 },
};
function build(type) {
  const K = KINDS[type], core = new THREE.Group(), hands = [];
  const eyeM = M(0x2d2140, .3), shine = new THREE.MeshBasicMaterial({ color: 0xffffff }), blush = M(K.blush || 0xff9ec0, .9);
  const eyes = (y, z, sp, cx, cy, cz, em) => {
    for (const s of [-1, 1]) {
      mk(sph(.075, 16, 12), em || eyeM, [s * sp, y, z], core);
      if (!em) mk(sph(.026, 8, 8), shine, [s * sp + .025, y + .03, z + .06], core);
      mk(sph(.09, 12, 10), blush, [s * cx, cy, cz], core).scale.z = .4;
    }
  };
  if (K.k === 's') {
    mk(sph(.55, 32, 24), M(K.c, .25), [0, .48, 0], core).scale.set(1.05, .88, 1.05);
    eyes(.52, .55, .18, .32, .38, .47);
    mk(new THREE.TorusGeometry(.05, .014, 8, 16, Math.PI), eyeM, [0, .43, .56], core).rotation.z = Math.PI;
    if (K.ears) {
      for (const s of [-1, 1]) { const e = mk(new THREE.ConeGeometry(.15, .32, 16), M(K.c, .4), [s * .3, .98, 0], core); e.rotation.z = -s * .35; }
    } else {
      const leaf = mk(sph(.16, 12, 10), M(0x8fe08a), [.06, 1.0, 0], core);
      leaf.scale.set(1, .45, .6); leaf.rotation.z = -.5;
    }
  } else {
    const white = M(K.c, .35);
    mk(sph(.5, 32, 24), white, [0, .5, 0], core).scale.set(1.08, .92, 1.02);
    mk(sph(.4, 24, 16), M(0x33414a, .2), [0, .55, .3], core).scale.set(1, .72, .62);
    const glow = new THREE.MeshStandardMaterial({ color: K.glow, emissive: K.glow, emissiveIntensity: 1.2 });
    eyes(.58, .56, .15, .27, .48, .49, glow);
    mk(new THREE.TorusGeometry(.05, .014, 8, 16, Math.PI), glow, [0, .5, .55], core).rotation.z = Math.PI;
    for (const s of [-1, 1]) {
      const ear = mk(new THREE.CapsuleGeometry(.1, .4, 6, 12), white, [s * .22, 1.18, -.02], core);
      ear.rotation.z = -s * .18;
      mk(new THREE.CapsuleGeometry(.05, .28, 6, 8), blush, [0, 0, .07], ear);
      hands.push(mk(sph(.1, 14, 10), white, [s * .5, .35, .12], core));
    }
  }
  return { core, hands };
}
function makePlayer(type, name) {
  const o = { type, vy: 0, y: 0, land: 0, moving: false, mesh: new THREE.Group() };
  scene.add(o.mesh);
  o.n = Object.assign(document.createElement('div'), { className: 'name', textContent: name });
  o.b = Object.assign(document.createElement('div'), { className: 'bubble' });
  $('#labels').append(o.n, o.b);
  setType(o, type);
  return o;
}
function setType(o, type) {
  if (o.core) o.mesh.remove(o.core);
  Object.assign(o, build(type), { type });
  o.mesh.add(o.core);
}
function say(o, msg) {
  o.b.textContent = msg; o.b.classList.add('on');
  clearTimeout(o.to); o.to = setTimeout(() => o.b.classList.remove('on'), 4200);
}
function step(o, mx, mz, dt, sp = 5) {
  const l = Math.hypot(mx, mz);
  o.moving = l > .05;
  if (!o.moving) return;
  const p = o.mesh.position, k = Math.min(l, 1);
  p.x += mx / l * sp * k * dt;
  p.z += mz / l * sp * k * dt;
  o.mesh.rotation.y += wrap(Math.atan2(mx, mz) - o.mesh.rotation.y) * (1 - Math.exp(-dt * 12));
  for (const [ox, oz, r] of obstacles) {
    const dx = p.x - ox, dz = p.z - oz, d = Math.hypot(dx, dz) || 1;
    if (d < r) { p.x = ox + dx / d * r; p.z = oz + dz / d * r; }
  }
  const d = Math.hypot(p.x, p.z);
  if (d > 13) { p.x *= 13 / d; p.z *= 13 / d; }
}
function animate(o, dt, t) {
  o.vy -= 32 * dt; o.y += o.vy * dt;
  if (o.y <= 0) { if (o.vy < -4) o.land = .28; o.y = 0; o.vy = 0; }
  const air = o.y > .001, bot = KINDS[o.type].k === 'b';
  const hop = !air && o.moving ? Math.abs(Math.sin(t * 10)) * (bot ? .08 : .22) : 0;
  o.land *= Math.exp(-dt * 9);
  const s = air ? 1 + Math.min(Math.abs(o.vy) * .018, .25) : 1 - o.land + Math.sin(t * 3) * .015;
  o.core.position.y = o.y + hop + (bot ? Math.sin(t * 3) * .04 : 0);
  o.core.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
  o.hands.forEach((h, i) => { h.position.z = .12 + (o.moving ? Math.sin(t * 10 + i * Math.PI) * .15 : 0); });
}
const tmp = new V();
function place(o) {
  tmp.copy(o.mesh.position); tmp.y += 1.7; tmp.project(camera);
  const x = (tmp.x * .5 + .5) * innerWidth, y = (-tmp.y * .5 + .5) * innerHeight;
  for (const e of [o.n, o.b]) { e.style.display = tmp.z > 1 ? 'none' : 'block'; e.style.transform = `translate(${x}px,${y}px) translate(-50%,-100%)`; }
}

// ---- flow ----
let state = 'intro', sel = 'slime', me, npcs = [], nextHop = 0, nearby = null;
$('#go').onclick = () => {
  state = 'pick'; $('#intro').classList.add('hidden'); $('#pick').classList.remove('hidden');
  me = makePlayer(sel, 'You');
};
document.querySelectorAll('.pick').forEach(b => b.onclick = () => {
  document.querySelectorAll('.pick').forEach(x => x.classList.toggle('on', x === b));
  sel = b.dataset.t; setType(me, sel); b.blur();
});
$('#start').onclick = () => {
  state = 'play'; $('#pick').classList.add('hidden'); $('#hud').classList.remove('hidden');
  me.mesh.rotation.y = Math.PI;
  [['pip', 'Pip', -9, -2], ['mochi', 'Momo', 8, 3]].forEach(([t, n, x, z], i) => {
    const o = makePlayer(t, n); o.mesh.position.set(x, 0, z);
    npcs.push({ o, goal: new V(x, 0, z), t: rand(1, 4) });
    setTimeout(() => say(o, NPC_LINES[i]), 1500 + i * 1200);
  });
};

// ---- input ----
const keys = new Set();
let joy = { x: 0, y: 0 }, yaw = 0, pitch = .3, dist = 9;
const jump = () => { if (me && me.y === 0 && !panelOpen) me.vy = 11; };
addEventListener('keydown', e => {
  if (e.key === 'Escape' && panelOpen) return closePanel();
  if (e.target.tagName === 'INPUT' || panelOpen) return;
  const k = e.key.toLowerCase();
  if (k === 'n') toggleTod();
  if (k === 't') toggleTemp();
  if (state !== 'play') return;
  if (k === 'e' && nearby) open(nearby);
  if (e.code === 'Space') { e.preventDefault(); jump(); }
  if (e.key === 'Enter') { e.preventDefault(); $('#msg').focus(); }
  keys.add(k);
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
$('#msg').addEventListener('keydown', e => { if (e.key === 'Escape') e.target.blur(); });
$('#chat').addEventListener('submit', e => {
  e.preventDefault();
  const v = $('#msg').value.trim();
  if (v) say(me, v);
  $('#msg').value = '';
  if (coarse) $('#msg').blur();
});
$('#jump').addEventListener('pointerdown', jump);
$('#prompt').onclick = e => { if (nearby) open(nearby); e.currentTarget.blur(); };

const joyEl = $('#joy'), knob = joyEl.firstElementChild;
let joyId = null;
function joyMove(e) {
  const r = joyEl.getBoundingClientRect(), m = 38;
  let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
  const d = Math.hypot(dx, dy);
  if (d > m) { dx *= m / d; dy *= m / d; }
  knob.style.transform = `translate(${dx}px,${dy}px)`;
  joy = { x: dx / m, y: dy / m };
}
joyEl.addEventListener('pointerdown', e => { joyId = e.pointerId; joyEl.setPointerCapture(joyId); joyMove(e); });
joyEl.addEventListener('pointermove', e => { if (e.pointerId === joyId) joyMove(e); });
const joyEnd = e => { if (e.pointerId !== joyId) return; joyId = null; joy = { x: 0, y: 0 }; knob.style.transform = ''; };
joyEl.addEventListener('pointerup', joyEnd);
joyEl.addEventListener('pointercancel', joyEnd);

const ray = new THREE.Raycaster(), mp = new THREE.Vector2();
const hit = e => {
  mp.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(mp, camera);
  const h = ray.intersectObjects(stations.map(s => s.sign))[0];
  return h && stations.find(s => s.sign === h.object);
};
let drag = null;
canvas.addEventListener('pointerdown', e => {
  if (state !== 'play') return;
  const s = hit(e);
  if (s) return open(s);
  drag = { x: e.clientX, y: e.clientY }; canvas.style.cursor = 'grabbing';
});
canvas.addEventListener('pointermove', e => {
  if (state !== 'play') return;
  if (drag) {
    yaw -= (e.clientX - drag.x) * .005;
    pitch = clamp(pitch + (e.clientY - drag.y) * .005, .02, 1.2);
    drag = { x: e.clientX, y: e.clientY };
  } else {
    const s = hit(e);
    stations.forEach(x => x.hover = x === s);
    canvas.style.cursor = s ? 'pointer' : 'grab';
  }
});
addEventListener('pointerup', () => { drag = null; canvas.style.cursor = 'grab'; });
canvas.addEventListener('wheel', e => { dist = clamp(dist + e.deltaY * .01, 5, 14); }, { passive: true });
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---- loop ----
const clock = new THREE.Clock(), look = new V(0, 1, 0), pv = new V(), c1 = new THREE.Color();
const vis = y => clamp((y + 4) / 14, 0, 1);
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;

  // mood blending
  const T = P[key()], a = 1 - Math.exp(-dt * 2.2);
  CK.forEach(k => cur[k].lerp(c1.set(T[k]), a));
  cur.hi += (T.hi - cur.hi) * a; cur.si += (T.si - cur.si) * a;
  nightMix += ((night ? 1 : 0) - nightMix) * a;
  phase += (phaseT - phase) * (1 - Math.exp(-dt * 1.6));
  scene.fog.color.copy(cur.sky);
  hemi.color.copy(cur.hs); hemi.groundColor.copy(cur.hg); hemi.intensity = cur.hi;
  sun.color.copy(cur.sun); sun.intensity = cur.si;
  grassM.color.copy(cur.grass); dirtM.color.copy(cur.dirt); waterM.color.copy(cur.water); cloudM.color.copy(cur.cloud);
  leafM.forEach((m, i) => m.color.copy(cur.leaf).offsetHSL(0, 0, (i - 1) * .05));
  sunS.position.set(Math.cos(phase) * 40, Math.sin(phase) * 70, -70);
  moonS.position.set(Math.cos(phase + Math.PI) * 40, Math.sin(phase + Math.PI) * 70, -70);
  sunS.material.opacity = vis(sunS.position.y); moonS.material.opacity = vis(moonS.position.y);
  sunS.material.color.copy(cur.sun); moonS.material.color.copy(cur.sun);
  starM.opacity = nightMix * .9;
  sun.position.copy(sunS.position).lerp(moonS.position, nightMix).normalize();
  sun.position.y = Math.max(sun.position.y, .35); sun.position.normalize().multiplyScalar(24);
  pMat.color.lerp(c1.set(cold ? 0xffffff : 0xffe27a), a);
  pMat.size += ((cold ? .16 : .22) - pMat.size) * a;
  pMat.opacity += ((cold ? .9 : night ? 1 : 0) - pMat.opacity) * a;
  for (let i = 0; i < N; i++) {
    const j = i * 3;
    if (cold) { pa[j + 1] -= 1.5 * dt; pa[j] += Math.sin(t + seed[i]) * .4 * dt; if (pa[j + 1] < 0) pa[j + 1] = 14; }
    else { pa[j + 1] = clamp(pa[j + 1] + Math.sin(t * .7 + seed[i]) * .25 * dt, .4, 5); pa[j] += Math.cos(t * .5 + seed[i]) * .3 * dt; }
  }
  pGeo.attributes.position.needsUpdate = true;

  clouds.rotation.y += dt * .02;
  stations.forEach((s, i) => {
    s.sign.position.y = 2.4 + Math.sin(t * 2 + i) * .12;
    s.sign.lookAt(camera.position);
    const k = s.hover ? 1.14 : 1;
    s.sign.scale.lerp(pv.set(k, k, k), 1 - Math.exp(-dt * 10));
  });

  let tp, tl;
  if (state === 'intro') {
    const ang = reduce ? .6 : t * .08;
    tp = [Math.sin(ang) * 30, 7, Math.cos(ang) * 30]; tl = [0, 4, 0];
  } else if (state === 'pick') {
    tp = [0, 1.8, 4.8]; tl = [0, .9, 0];
    me.mesh.rotation.y = t * .6; me.moving = false;
    if (t > nextHop && me.y === 0) { me.vy = 8; nextHop = t + 1.6; }
  } else {
    const lock = panelOpen;
    const ix = lock ? 0 : (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0) + joy.x;
    const iz = lock ? 0 : (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - joy.y;
    const sy = Math.sin(yaw), cy = Math.cos(yaw), cp = Math.cos(pitch), p = me.mesh.position;
    step(me, ix * cy - iz * sy, -ix * sy - iz * cy, dt);
    tp = [p.x + sy * cp * dist, Math.sin(pitch) * dist + 1, p.z + cy * cp * dist]; tl = [p.x, 1.1, p.z];

    nearby = null;
    let best = 2.8;
    for (const s of stations) { const d = Math.hypot(p.x - s.x, p.z - s.z); if (d < best) { best = d; nearby = s; } }
    const pr = $('#prompt');
    pr.classList.toggle('hidden', !nearby || panelOpen);
    if (nearby) pr.textContent = `${nearby.emoji} Open ${nearby.label}${coarse ? '' : ' · E'}`;

    for (const n of npcs) {
      n.t -= dt;
      if (n.t <= 0) {
        n.goal.set(rand(-9, 9), 0, rand(-2, 8)); n.t = rand(4, 8);
        if (Math.random() < .5) say(n.o, NPC_LINES[Math.floor(Math.random() * NPC_LINES.length)]);
      }
      const dx = n.goal.x - n.o.mesh.position.x, dz = n.goal.z - n.o.mesh.position.z;
      if (Math.hypot(dx, dz) > .4) step(n.o, dx, dz, dt, 2.5); else n.o.moving = false;
    }
  }
  const k = 1 - Math.exp(-dt * (state === 'play' ? 8 : 3));
  camera.position.lerp(pv.set(...tp), k);
  look.lerp(pv.set(...tl), k);
  camera.lookAt(look);

  for (const o of [me, ...npcs.map(n => n.o)]) if (o) { animate(o, dt, t); if (state !== 'intro') place(o); }
  renderer.render(scene, camera);
});
