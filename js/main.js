import * as THREE from 'three';

// ---- edit me ----
const LINKS = [
  { label: 'GitHub',   emoji: '🐙', url: 'https://github.com/',   color: '#8f7bff' },
  { label: 'LinkedIn', emoji: '💼', url: 'https://linkedin.com/', color: '#5fb4ff' },
  { label: 'X',        emoji: '🐦', url: 'https://x.com/',        color: '#ff8fbf' },
];
const NPC_LINES = ['Hi! Welcome 🌸', 'Try the signs!', 'Nice island, huh?', 'Boing boing~', 'Pat the blobs 🫧'];
// -----------------

const $ = s => document.querySelector(s);
const V = THREE.Vector3;
const M = (c, r = .7) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const rand = (a, b) => a + Math.random() * (b - a);
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

const canvas = $('#webgl');
const scene = new THREE.Scene();
const sky = new THREE.Color(0xfde8f3);
scene.background = sky;
scene.fog = new THREE.Fog(sky, 35, 90);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, .1, 200);
camera.position.set(0, 12, 28);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

scene.add(new THREE.HemisphereLight(0xffffff, 0xffd6e8, 1.7));
const sun = new THREE.DirectionalLight(0xfff3e0, 2.2);
sun.position.set(10, 18, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, far: 60 });
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

// ---- island ----
const obstacles = []; // [x, z, radius]
mk(cyl(14, 14, 1, 64), M(0xb8ecc8), [0, -.5, 0]);
mk(cyl(14.2, 8, 4, 64), M(0xf3cfa5), [0, -3, 0]);
mk(cyl(2.6, 2.6, .05, 48), M(0x9ad8ff, .2), [-7, .03, 5]);

function tree(x, z, s, c) {
  mk(cyl(.15 * s, .22 * s, 1.2 * s, 10), M(0xb88a6a), [x, .6 * s, z]);
  mk(sph(1.1 * s), M(c), [x, 1.9 * s, z]);
  mk(sph(.7 * s), M(c), [x + .6 * s, 1.5 * s, z + .3 * s]);
  obstacles.push([x, z, .6 * s]);
}
tree(-10, -3, 1.1, 0xff9fc8); tree(10, -2, 1, 0xb7e6a0); tree(-9, -9, .9, 0xb7a6ff);
tree(9, 6, 1.2, 0xffd36e); tree(2, 10, .9, 0xff9fc8); tree(-3, 11, 1, 0xb7e6a0);

const petals = [0xff8fbf, 0xffd36e, 0xffffff, 0xb7a6ff];
for (let i = 0; i < 40; i++) {
  const a = rand(0, 6.28), r = rand(4, 12.5), x = Math.cos(a) * r, z = Math.sin(a) * r;
  if (z < -5.5 && Math.abs(x) < 8) continue;
  mk(sph(.16, 10, 8), M(petals[i % 4], .9), [x, .16, z]);
}

const clouds = new THREE.Group();
scene.add(clouds);
for (let i = 0; i < 7; i++) {
  const c = new THREE.Group(), a = i * .9, r = rand(22, 40);
  for (let j = 0; j < 3; j++) { const b = new THREE.Mesh(sph(rand(1.6, 2.6), 16, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 })); b.position.set(j * 2 - 2, rand(-.3, .5), 0); c.add(b); }
  c.position.set(Math.cos(a) * r, rand(7, 14), Math.sin(a) * r);
  clouds.add(c);
}

// ---- link signs ----
function badge(l) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = l.color; g.beginPath(); g.roundRect(16, 16, 224, 224, 64); g.fill();
  g.fillStyle = '#fff'; g.textAlign = 'center';
  g.font = '100px serif'; g.fillText(l.emoji, 128, 140);
  g.font = 'bold 34px ui-rounded, system-ui, sans-serif'; g.fillText(l.label, 128, 207);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const stations = LINKS.map((l, i) => {
  const x = (i - (LINKS.length - 1) / 2) * 5.2, z = -8;
  mk(cyl(1.1, 1.3, .7), M(0xfff1dc), [x, .35, z]);
  const ring = mk(new THREE.TorusGeometry(1.15, .09, 12, 40), M(l.color), [x, .72, z]);
  ring.rotation.x = Math.PI / 2;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9), new THREE.MeshBasicMaterial({ map: badge(l), transparent: true, side: THREE.DoubleSide }));
  sign.position.set(x, 2.4, z);
  scene.add(sign);
  obstacles.push([x, z, 1.4]);
  return { ...l, x, z, sign, hover: false };
});
const open = s => window.open(s.url, '_blank', 'noopener');
$('#links').innerHTML = LINKS.map(l => `<a href="${l.url}" target="_blank" rel="noopener">${l.emoji} ${l.label}</a>`).join('');

// ---- characters ----
function build(type) {
  const core = new THREE.Group(), hands = [];
  const eyeM = M(0x2d2140, .3), shine = new THREE.MeshBasicMaterial({ color: 0xffffff }), blush = M(0xff9ec0, .9);
  const eyes = (y, z, sp, cx, cy, cz, em) => {
    for (const s of [-1, 1]) {
      mk(sph(.075, 16, 12), em || eyeM, [s * sp, y, z], core);
      if (!em) mk(sph(.026, 8, 8), shine, [s * sp + .025, y + .03, z + .06], core);
      mk(sph(.09, 12, 10), blush, [s * cx, cy, cz], core).scale.z = .4;
    }
  };
  if (type === 'slime') {
    mk(sph(.55, 32, 24), M(0x7fe0d4, .25), [0, .48, 0], core).scale.set(1.05, .88, 1.05);
    eyes(.52, .55, .18, .32, .38, .47);
    mk(new THREE.TorusGeometry(.05, .014, 8, 16, Math.PI), eyeM, [0, .43, .56], core).rotation.z = Math.PI;
    const leaf = mk(sph(.16, 12, 10), M(0x8fe08a), [.06, 1.0, 0], core);
    leaf.scale.set(1, .45, .6); leaf.rotation.z = -.5;
  } else {
    const white = M(0xece6ff, .35);
    mk(sph(.5, 32, 24), white, [0, .5, 0], core).scale.set(1.08, .92, 1.02);
    mk(sph(.4, 24, 16), M(0x3b2f55, .2), [0, .55, .3], core).scale.set(1, .72, .62);
    const glow = new THREE.MeshStandardMaterial({ color: 0x6ff3ff, emissive: 0x6ff3ff, emissiveIntensity: 1.2 });
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
  const p = o.mesh.position;
  p.x += mx / l * sp * Math.min(l, 1) * dt;
  p.z += mz / l * sp * Math.min(l, 1) * dt;
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
  const air = o.y > .001;
  const hop = !air && o.moving ? Math.abs(Math.sin(t * 10)) * (o.type === 'slime' ? .22 : .08) : 0;
  o.land *= Math.exp(-dt * 9);
  const s = air ? 1 + Math.min(Math.abs(o.vy) * .018, .25) : 1 - o.land + Math.sin(t * 3) * .015;
  o.core.position.y = o.y + hop + (o.type === 'bot' ? Math.sin(t * 3) * .04 : 0);
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
let state = 'intro', sel = 'slime', me, npc, npcGoal = new V(), npcT = 0, nextHop = 0, nearby = null;
$('#go').onclick = () => {
  state = 'pick'; $('#intro').classList.add('hidden'); $('#pick').classList.remove('hidden');
  me = makePlayer(sel, 'You');
};
document.querySelectorAll('.pick').forEach(b => b.onclick = () => {
  document.querySelectorAll('.pick').forEach(x => x.classList.toggle('on', x === b));
  sel = b.dataset.t; setType(me, sel);
});
$('#start').onclick = () => {
  state = 'play'; $('#pick').classList.add('hidden'); $('#hud').classList.remove('hidden');
  me.mesh.rotation.y = Math.PI;
  npc = makePlayer('bot', 'Pip'); npc.mesh.position.set(-9, 0, -3);
  setTimeout(() => say(npc, NPC_LINES[0]), 1500);
};

// ---- input ----
const keys = new Set();
let joy = { x: 0, y: 0 }, yaw = 0, pitch = .55, dist = 9;
const jump = () => { if (me && me.y === 0) me.vy = 11; };
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || state !== 'play') return;
  const k = e.key.toLowerCase();
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
$('#prompt').onclick = () => nearby && open(nearby);

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
    pitch = Math.max(.15, Math.min(1.2, pitch + (e.clientY - drag.y) * .005));
    drag = { x: e.clientX, y: e.clientY };
  } else {
    const s = hit(e);
    stations.forEach(x => x.hover = x === s);
    canvas.style.cursor = s ? 'pointer' : 'grab';
  }
});
addEventListener('pointerup', () => { drag = null; canvas.style.cursor = 'grab'; });
canvas.addEventListener('wheel', e => { dist = Math.max(5, Math.min(14, dist + e.deltaY * .01)); }, { passive: true });
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---- loop ----
const clock = new THREE.Clock(), look = new V(0, 1, 0), pv = new V();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
  clouds.rotation.y += dt * .02;
  stations.forEach((s, i) => {
    s.sign.position.y = 2.4 + Math.sin(t * 2 + i) * .12;
    s.sign.lookAt(camera.position);
    const k = s.hover ? 1.14 : 1;
    s.sign.scale.lerp(pv.set(k, k, k), 1 - Math.exp(-dt * 10));
  });

  let tp, tl;
  if (state === 'intro') {
    const a = reduce ? .6 : t * .08;
    tp = [Math.sin(a) * 28, 12, Math.cos(a) * 28]; tl = [0, 1, 0];
  } else if (state === 'pick') {
    tp = [0, 1.8, 4.8]; tl = [0, .9, 0];
    me.mesh.rotation.y = t * .6; me.moving = false;
    if (t > nextHop && me.y === 0) { me.vy = 8; nextHop = t + 1.6; }
  } else {
    const [ix, iz] = [
      (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0) + joy.x,
      (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - joy.y,
    ];
    const sy = Math.sin(yaw), cy = Math.cos(yaw), cp = Math.cos(pitch), p = me.mesh.position;
    step(me, ix * cy - iz * sy, -ix * sy - iz * cy, dt);
    tp = [p.x + sy * cp * dist, Math.sin(pitch) * dist + 1, p.z + cy * cp * dist]; tl = [p.x, 1.1, p.z];

    nearby = null;
    let best = 2.8;
    for (const s of stations) { const d = Math.hypot(p.x - s.x, p.z - s.z); if (d < best) { best = d; nearby = s; } }
    const pr = $('#prompt');
    pr.classList.toggle('hidden', !nearby);
    if (nearby) pr.textContent = `${nearby.emoji} Open ${nearby.label}${coarse ? '' : ' · E'}`;

    if (npc) {
      npcT -= dt;
      if (npcT <= 0) {
        npcGoal.set(rand(-9, 9), 0, rand(-4, 8)); npcT = rand(4, 8);
        if (Math.random() < .5) say(npc, NPC_LINES[Math.floor(Math.random() * NPC_LINES.length)]);
      }
      const dx = npcGoal.x - npc.mesh.position.x, dz = npcGoal.z - npc.mesh.position.z;
      if (Math.hypot(dx, dz) > .4) step(npc, dx, dz, dt, 2.5); else npc.moving = false;
    }
  }
  const k = 1 - Math.exp(-dt * (state === 'play' ? 8 : 3));
  camera.position.lerp(pv.set(...tp), k);
  look.lerp(pv.set(...tl), k);
  camera.lookAt(look);

  for (const o of [me, npc]) if (o) { animate(o, dt, t); state === 'intro' ? 0 : place(o); }
  renderer.render(scene, camera);
});
