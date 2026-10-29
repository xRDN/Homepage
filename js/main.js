import * as THREE from 'three';
import { sound } from './sound.js';
import { liveWeather, WX, WX_LIST, WX_ICON, WX_NAME, fit, nextWx, fakeTemp } from './weather.js';
import { createNet } from './net.js';
import { initAI, BUDDIES } from './ai.js';
import { createFishing, renderDex } from './fish.js';
import { createLayout } from './layout.js';
import * as PR from './props.js';

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
const NPC_LINES = ['Hi! Welcome 🌸', 'Check out the projects!', 'Nice island, huh?', 'Boing boing~', 'Try @Pip or @Momo in the chat!'];
// How the two buddies react when the weather turns (edit freely)
const WX_LINES = {
  pip: {
    clear: ['Blue skies! 🌤️'], cloudy: ['Clouds rolling in ☁️'], windy: ['Hold onto your ears! 🌬️'], rain: ['Rain! To the lean-to! 🌧️', 'Fish bite more in the rain, you know.'],
    storm: ['Thunder! Gazebo, now! ⛈️'], snow: ['Snow! The pond will freeze ❄️'], fog: ['Follow the lamps 🌫️'], heat: ['So hot… shade, please! 🌡️'],
  },
  momo: {
    clear: ['sun. ugh. nice, I guess'], cloudy: ['perfect nap light'], windy: ['whee. my ears.'], rain: ['RAIN. puddles!!'], storm: ['too loud. gazebo.'],
    snow: ['cold... fire?'], fog: ['cozy fog~'], heat: ['melting. mochi problems.'],
  },
};
// -----------------

const $ = s => document.querySelector(s);
const V = THREE.Vector3;
const M = PR.M, cyl = PR.cyl, sph = PR.sph;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const EMO = ['👋', '💃', '❤️'];
const toast = (msg, c = '#5aa469') => { const d = document.createElement('div'); d.className = 'toast'; d.textContent = msg; d.style.borderColor = c; $('#toasts').append(d); setTimeout(() => d.remove(), 3200); };
const sr = Object.assign(document.createElement('p'), { ariaLive: 'polite' }); sr.style.cssText = 'position:absolute;left:-9999px'; document.body.append(sr);

// ---- cache: preferences, island layout, offline assets ----
const ls = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} }, del: k => { try { localStorage.removeItem(k); } catch {} } };
const jget = (k, d) => { try { return JSON.parse(ls.get(k)) ?? d; } catch { return d; } };
const prefs = jget('island.prefs', {}), savePrefs = () => ls.set('island.prefs', JSON.stringify(prefs));
const lite = prefs.lite ?? (coarse && (navigator.hardwareConcurrency || 8) <= 4);
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
{ const t = document.createElement('canvas');
  if (!(t.getContext('webgl2') || t.getContext('webgl'))) { // plain 2D fallback
    $('#fallback').hidden = false;
    $('#fb-list').innerHTML = LINKS.map(l => `<a href="${l.url}">${l.emoji} ${l.label}</a>`).join('') + PROJECTS.map(p => `<a href="${p.url}">${p.emoji} ${p.name}: ${p.desc}</a>`).join('');
    throw new Error('WebGL unavailable');
  } }
// The layout is computed once per seed and cached, so the island looks the same on every visit until you re-roll it (🔀).
function getLayout() {
  if (!prefs.seed) { prefs.seed = 1 + Math.floor(Math.random() * 1e9); savePrefs(); }
  const key = `3|${prefs.seed}|${LINKS.length}|${PROJECTS.length}`;
  const c = jget('island.layout', null); if (c && c.key === key && c.L && c.L.props) return c.L;
  const L = createLayout({ seed: prefs.seed, links: LINKS.length, projects: PROJECTS.length });
  ls.set('island.layout', JSON.stringify({ key, L })); return L;
}
const L = getLayout(), POND = L.pond;

// ---- world moods: [day|night][warm|cold] palettes, then weather pushes on top ----
const PAL = {
  dw: { sky: 0x8ecdf0, hs: 0xffffff, hg: 0xd8c9a0, hi: 1.5, sun: 0xfff1cf, si: 2.4, grass: 0x8fcf6b, dirt: 0xc79a6b, water: 0x62c0e8, leaf: 0x58b04d, cloud: 0xffffff },
  dc: { sky: 0xc3d8e6, hs: 0xeaf3ff, hg: 0xb9c7cf, hi: 1.6, sun: 0xe6f0ff, si: 1.9, grass: 0xa9cbb6, dirt: 0xa69886, water: 0x9fcfe6, leaf: 0x5f9a85, cloud: 0xf2f6fa },
  nw: { sky: 0x2b2a4a, hs: 0x9a90d0, hg: 0x3a2a30, hi: 1.0, sun: 0xffd9a0, si: 1.3, grass: 0x4f7a47, dirt: 0x6b5340, water: 0x3b6ea0, leaf: 0x3f7a40, cloud: 0x6f7396 },
  nc: { sky: 0x10213d, hs: 0x7fa6e8, hg: 0x1c2a3f, hi: 1.0, sun: 0xbfd4ff, si: 1.4, grass: 0x41705f, dirt: 0x4a4f5c, water: 0x2f5f9a, leaf: 0x336a63, cloud: 0x5b6a8a },
};
const CK = ['sky', 'hs', 'hg', 'sun', 'grass', 'dirt', 'water', 'leaf', 'cloud'];
let night = (h => h < 6 || h >= 19)(new Date().getHours()), cold = false, wx = 'clear', auto = prefs.auto !== false, live = false, temp = null;
{ // deep links: #night #day #cold #rain #storm #snow #fog #windy #cloudy #heat #clear #auto #projects (combine with -)
  const w = location.hash.slice(1).toLowerCase().split(/[-,&+]/);
  if (w.includes('night')) night = true; if (w.includes('day')) night = false;
  const named = WX_LIST.find(x => w.includes(x));
  if (w.includes('cold')) { cold = true; wx = named || 'snow'; } else if (named) wx = named;
  if (named || w.includes('cold')) auto = false;
  if (w.includes('auto')) auto = true;
  if (named === 'snow') cold = true;
  wx = fit(wx, cold);
}
const key = () => (night ? 'n' : 'd') + (cold ? 'c' : 'w');
const cur = { hi: PAL[key()].hi, si: PAL[key()].si };
CK.forEach(k => cur[k] = new THREE.Color(PAL[key()][k]));
const fx = { ...WX[wx] };                       // blended weather numbers, eased towards WX[wx]
let wet = fx.rain > 0 ? 1 : 0, snowCover = wx === 'snow' ? .85 : 0, ice = cold ? 1 : 0, shel = 0, aurora = 0, flash = 0;
let phase = .45 + (night ? Math.PI : 0), phaseT = phase, nightMix = night ? 1 : 0;
const WD = { x: Math.cos(.6), z: Math.sin(.6) }; // wind blows towards +x/+z
const currentTemp = () => live && temp != null ? temp : fakeTemp(wx, night, cold);

const strip = $('#wxs');
strip.innerHTML = WX_LIST.map(w => `<button class="ico" data-w="${w}" title="${WX_NAME[w]}" aria-label="${WX_NAME[w]} weather">${WX_ICON[w]}</button>`).join('');
let lastChip = '';
function syncMood() {
  $('#b-tod').textContent = night ? '🌙' : '☀️'; $('#b-tod').title = $('#b-tod').ariaLabel = night ? 'Night: tap for day (N)' : 'Day: tap for night (N)';
  $('#b-temp').textContent = cold ? '❄️' : '🔥'; $('#b-temp').title = $('#b-temp').ariaLabel = cold ? 'Cold: tap for warm (T)' : 'Warm: tap for cold (T)';
  $('#b-auto').classList.toggle('on', auto && !live); $('#b-live').classList.toggle('on', live);
  $('#b-live').title = live ? `Real weather near you · ${temp}° (tap to stop)` : 'Match your real local weather';
  strip.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.w === wx));
}
const unlive = () => { live = false; temp = null; ls.del('island.live'); syncMood(); };
function changed(prev) {
  syncMood();
  if (prev === wx || state !== 'play') return;
  toast(`${WX_ICON[wx]} ${WX_NAME[wx]}`, '#7fb0d6'); sr.textContent = `Weather: ${WX_NAME[wx]}`;
  for (const n of npcs) if (Math.random() < .8 && n.mode === 'wander') setTimeout(() => state === 'play' && n.mode === 'wander' && say(n.o, pick(WX_LINES[n.who][wx])), rand(900, 3200));
}
function setWeather(w, manual) {
  const prev = wx;
  if (manual) { if (auto) { auto = false; prefs.auto = false; savePrefs(); toast('🔒 Weather locked · 🎲 lets it drift again', '#8fa39a'); } if (live) unlive(); }
  if (w === 'snow') cold = true; else if (w === 'heat') cold = false;
  wx = fit(w, cold); changed(prev);
}
const toggleTod = () => { if (live) unlive(); night = !night; phaseT += Math.PI; syncMood(); };
const toggleTemp = () => {
  if (live) unlive();
  const prev = wx; cold = !cold;
  if (cold && ['clear', 'heat', 'rain', 'storm'].includes(wx)) wx = 'snow'; else if (!cold && wx === 'snow') wx = 'clear';
  wx = fit(wx, cold); changed(prev);
};
const applyLive = r => { const prev = wx; if (r.night !== night) { night = r.night; phaseT += Math.PI; } cold = r.cold; wx = r.wx; temp = r.temp; live = true; changed(prev); };
const goLive = () => liveWeather().then(r => { applyLive(r); ls.set('island.live', '1'); }).catch(() => { $('#b-live').title = 'Location blocked'; $('#b-live').classList.remove('on'); });
setInterval(() => { if (live) liveWeather().then(applyLive).catch(() => {}); }, 15 * 60 * 1000);
if (ls.get('island.live') === '1') goLive();
syncMood();

// ---- renderer ----
const canvas = $('#webgl');
const scene = new THREE.Scene();
const bg = cur.sky.clone();
scene.background = bg;
scene.fog = new THREE.Fog(bg.clone(), 35, 90);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, .1, 200);
camera.position.set(0, 9, 30);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, lite ? 1 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = !lite;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 1.5); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2);
sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, far: 70 });
scene.add(sun);
const mk = (geo, mat, pos, parent = scene, shadow) => PR.mk(geo, mat, pos, parent, shadow);
const tex = draw => { const c = document.createElement('canvas'); c.width = c.height = 256; draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };

// ---- sun, moon, stars, aurora ----
const body = (map, size) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, fog: false, transparent: true, depthWrite: false })); s.scale.setScalar(size); scene.add(s); return s; };
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
const dotTex = tex(g => { const r = g.createRadialGradient(128, 128, 0, 128, 128, 128); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.45, 'rgba(255,255,255,.85)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 256, 256); });
const starM = new THREE.PointsMaterial({ color: 0xffffff, size: 1.8, map: dotTex, transparent: true, opacity: 0, fog: false, depthWrite: false });
const stars = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(sg, 3)), starM); stars.frustumCulled = false; scene.add(stars);
// aurora: a curved curtain in the north sky, only on clear, cold nights
const auroraTex = tex(g => {
  for (let x = 0; x < 256; x += 2) {
    const h = 90 + Math.random() * 150, a = .35 + Math.random() * .65, gr = g.createLinearGradient(0, 256, 0, 256 - h);
    gr.addColorStop(0, `rgba(80,255,170,${a})`); gr.addColorStop(.55, `rgba(60,200,220,${a * .6})`); gr.addColorStop(1, 'rgba(190,90,255,0)');
    g.fillStyle = gr; g.fillRect(x, 256 - h, 2, h);
  }
});
auroraTex.wrapS = THREE.RepeatWrapping;
const aGeo = new THREE.PlaneGeometry(130, 32, 40, 1), aPos = aGeo.attributes.position, aBase = Float32Array.from(aPos.array);
for (let i = 0; i < aPos.count; i++) { const x = aBase[i * 3], an = x / 65; aPos.setX(i, Math.sin(an) * 65); aPos.setZ(i, (Math.cos(an) - 1) * 34); }
const auroraM = new THREE.Mesh(aGeo, new THREE.MeshBasicMaterial({ map: auroraTex, transparent: true, opacity: 0, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
auroraM.position.set(0, 22, -70); auroraM.frustumCulled = false; scene.add(auroraM);

// ---- precipitation: rain streaks, plus one Points system for snow / blowing leaves / fireflies ----
const N = lite ? 130 : 320, RN = lite ? 240 : 560, pa = new Float32Array(N * 3), seed = new Float32Array(N);
for (let i = 0; i < N; i++) { pa[i * 3] = rand(-22, 22); pa[i * 3 + 1] = rand(.4, 14); pa[i * 3 + 2] = rand(-22, 22); seed[i] = rand(0, 6.28); }
const pGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pa, 3));
const pMat = new THREE.PointsMaterial({ size: .16, map: dotTex, transparent: true, opacity: 0, depthWrite: false, color: 0xffffff });
const parts = new THREE.Points(pGeo, pMat); parts.frustumCulled = false; scene.add(parts);
const rh = new Float32Array(RN * 3), rl = new Float32Array(RN * 6);
for (let i = 0; i < RN; i++) { rh[i * 3] = rand(-22, 22); rh[i * 3 + 1] = rand(0, 14); rh[i * 3 + 2] = rand(-22, 22); }
const rGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(rl, 3));
const rMat = new THREE.LineBasicMaterial({ color: 0xbcd6ff, transparent: true, opacity: 0, depthWrite: false });
const rainL = new THREE.LineSegments(rGeo, rMat); rainL.frustumCulled = false; scene.add(rainL);
// lightning bolt
const bPos = new Float32Array(14 * 3), bGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(bPos, 3));
const bolt = new THREE.Line(bGeo, new THREE.LineBasicMaterial({ color: 0xeef3ff, fog: false })); bolt.frustumCulled = false; bolt.visible = false; scene.add(bolt);

// ---- clouds ----
const cloudM = M(0xffffff, 1);
const clouds = new THREE.Group(); scene.add(clouds);
const cloudList = [];
for (let i = 0; i < 12; i++) {
  const c = new THREE.Group(), a = i * 2.4, r = rand(22, 42);
  for (let j = 0; j < 3; j++) { const b = new THREE.Mesh(sph(rand(1.6, 2.6), 16, 12), cloudM); b.position.set(j * 2 - 2, rand(-.3, .5), 0); c.add(b); }
  c.position.set(Math.cos(a) * r, rand(7, 14), Math.sin(a) * r); clouds.add(c); cloudList.push(c);
}

// ---- island ----
const obstacles = []; // [x, z, radius]
const grassM = PR.snowy(M(0xffffff, .9), .92), dirtM = PR.snowy(M(0xffffff, .95), .55), waterM = M(0xffffff, .2);
mk(cyl(14, 14, 1, 64), grassM, [0, -.5, 0]);
mk(cyl(14.2, 8, 4, 64), dirtM, [0, -3, 0]);
waterM.transparent = true; waterM.opacity = .85;
const pondMesh = mk(cyl(POND.r, POND.r, .05, 48), waterM, [POND.x, .03, POND.z]);
const iceM = new THREE.MeshStandardMaterial({ color: 0xd9eefa, roughness: .15, metalness: .1, transparent: true, opacity: 0 });
const iceMesh = mk(cyl(POND.r + .05, POND.r + .05, .06, 48), iceM, [POND.x, .06, POND.z]); iceMesh.visible = false;
for (let i = 0; i < 14; i++) { // shore stones (ring pattern)
  const a = i / 14 * 6.283 + .2, s = rand(.14, .26), r = mk(new THREE.DodecahedronGeometry(1, 0), PR.MATS.rock[i % 2], [POND.x + Math.cos(a) * (POND.r + .1), s * .4, POND.z + Math.sin(a) * (POND.r + .1)]);
  r.scale.set(s, s * .7, s); r.rotation.y = i;
}
for (let i = 0; i < 4; i++) { const p = PR.lilypad(rand(.25, .38)); p.position.x = POND.x + Math.cos(i * 1.7 + 1) * rand(.6, 1.7); p.position.z = POND.z + Math.sin(i * 1.7 + 1) * rand(.6, 1.7); scene.add(p); }
const pondRipples = Array.from({ length: 6 }, (_, i) => {
  const r = mk(new THREE.RingGeometry(.8, 1, 24), PR.MATS.ripple.clone(), [POND.x, .1, POND.z], scene, false); r.rotation.x = -Math.PI / 2; r.userData = { ph: i / 6, u: 0 }; return r;
});

// stepping stones (instanced)
{
  const geo = new THREE.CylinderGeometry(.4, .45, .07, 9), im = new THREE.InstancedMesh(geo, PR.MATS.stone, L.stones.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new V(), ps = new V();
  L.stones.forEach((s, i) => { e.set(0, s.rot, 0); q.setFromEuler(e); m4.compose(ps.set(s.x, .035, s.z), q, sc.set(s.s, 1, s.s * .9)); im.setMatrixAt(i, m4); });
  im.receiveShadow = true; scene.add(im);
}
const loc = (s, lx, lz) => { const c = Math.cos(s.rot), n = Math.sin(s.rot); return { x: s.x + lx * c + lz * n, z: s.z - lx * n + lz * c }; };

// props from the layout
const swayList = [], flowers = [], fires = [], windmills = [], fence = [], puddles = [];
for (const p of L.props) {
  let o;
  switch (p.k) {
    case 'tree': o = PR.tree(p.v, p.s, p.m); obstacles.push([p.x, p.z, p.r * p.s]); break;
    case 'bush': o = PR.bush(p.s, p.m, p.v === 'berry'); obstacles.push([p.x, p.z, p.r * p.s]); break;
    case 'rock': o = PR.rock(p.s, p.m); obstacles.push([p.x, p.z, p.r]); break;
    case 'flower': o = PR.flower(p.c); flowers.push(o); break;
    case 'mushroom': o = PR.mushroom(p.c, p.s); break;
    case 'lamp': o = PR.lamp(); obstacles.push([p.x, p.z, .18]); break;
    case 'bench': o = PR.bench(); obstacles.push([p.x, p.z, .6]); break;
    case 'crate': o = PR.crate(); obstacles.push([p.x, p.z, .32]); break;
    case 'barrel': o = PR.barrel(); obstacles.push([p.x, p.z, .3]); break;
    case 'campfire': o = PR.campfire(); obstacles.push([p.x, p.z, .32]); fires.push({ o, x: p.x, z: p.z }); break;
    case 'windmill': o = PR.windmill(); obstacles.push([p.x, p.z, 1.1]); windmills.push(o); break;
    case 'fence': o = PR.fencePost(); obstacles.push([p.x, p.z, .16]); fence.push(p); break;
  }
  if (!o) continue;
  o.position.set(p.x, 0, p.z); o.rotation.y = p.rot; scene.add(o);
  if (o.userData.sway) { o.rotation.order = 'YXZ'; swayList.push(o); }
}
fence.sort((a, b) => Math.atan2(a.z, a.x) - Math.atan2(b.z, b.x));
for (let i = 1; i < fence.length; i++) {
  const a = fence[i - 1], b = fence[i], d = Math.hypot(b.x - a.x, b.z - a.z);
  if (d > 2.2) continue;
  const r = PR.fenceRail(d); r.position.set((a.x + b.x) / 2, .6, (a.z + b.z) / 2); r.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x); scene.add(r);
  const r2 = PR.fenceRail(d); r2.position.set(r.position.x, .32, r.position.z); r2.rotation.y = r.rotation.y; scene.add(r2);
}
for (const pd of L.puddles) { const g = PR.puddle(pd.s); g.position.set(pd.x, 0, pd.z); scene.add(g); puddles.push(g); }

// shelters: gazebo + lean-to. sheltered() decides who stays dry; posts and walls are solid, the front stays open.
const shelters = L.shelters.map(s => {
  const o = s.k === 'gazebo' ? PR.gazebo() : PR.leanto();
  o.position.set(s.x, 0, s.z); o.rotation.y = s.rot; scene.add(o);
  const mats = []; // own copies of the materials, so a roof can turn see-through when the camera is close or you stand under it
  o.traverse(m => { if (m.isMesh && m.material !== PR.MATS.lamp) { const src = m.material, c = src.clone(); if (src.userData.base) { c.userData = { base: src.userData.base.clone(), k: src.userData.k }; PR.SNOWY.push(c); } c.transparent = true; m.material = c; mats.push(c); } });
  if (s.k === 'gazebo') for (let i = 0; i < 6; i++) { const q = loc(s, Math.cos(i * 1.047) * 1.85, Math.sin(i * 1.047) * 1.85); obstacles.push([q.x, q.z, .22]); }
  else {
    [-1.2, -.4, .4, 1.2].forEach(x => { const q = loc(s, x, -1.1); obstacles.push([q.x, q.z, .45]); });
    [-1.6, 1.6].forEach(x => { const q = loc(s, x, -.2), w = loc(s, x, .5), f = loc(s, x, 1.0); obstacles.push([q.x, q.z, .3], [w.x, w.z, .12], [f.x, f.z, .1]); });
  }
  const c = s.k === 'leanto' ? loc(s, 0, .25) : s;
  const slots = (s.k === 'gazebo' ? [[.8, .3], [-.8, .3]] : [[-.45, .95], [.95, .95]]).map(([x, z]) => loc(s, x, z));
  return { ...s, cx: c.x, cz: c.z, slots, mats, fade: 1 };
});
const sheltered = (x, z) => shelters.some(s => Math.hypot(x - s.cx, z - s.cz) < s.r);
const fireLight = new THREE.PointLight(0xff9a4a, 0, 9, 2);
if (fires[0]) { fireLight.position.set(fires[0].x, .9, fires[0].z); scene.add(fireLight); }

// clouds, golden acorns, shooting stars, rainbow
const got = new Set(jget('island.acorns', []));
const acorns = L.acorns.map((p, i) => {
  const g = new THREE.Group();
  mk(sph(.18, 12, 10), M(0xf0b030, .3), [0, 0, 0], g); mk(sph(.13, 10, 8), M(0xb8862a, .6), [0, .14, 0], g).scale.y = .6;
  g.position.set(p.x, .5, p.z); g.visible = !got.has(i); scene.add(g); return g;
});
const meteor = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xffffff, fog: false, transparent: true, opacity: 0, depthWrite: false }));
meteor.scale.setScalar(1.6); scene.add(meteor);
let mt = -1; const mv = new V();
const rb = new THREE.Group();
['#e0525a', '#f08a3c', '#f2c94c', '#6cc070', '#4aa3df', '#5a6fd0', '#9a6bd0'].forEach((c, i) => rb.add(new THREE.Mesh(new THREE.TorusGeometry(42 + i * 1.1, .55, 6, 64, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, fog: false, depthWrite: false }))));
rb.position.set(14, -3, -62); scene.add(rb);

// ---- signs: links + project board (positions come from the layout) ----
function badge(l) {
  return tex(g => {
    g.fillStyle = l.color; g.beginPath(); g.roundRect(16, 16, 224, 224, 64); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center';
    g.font = '100px serif'; g.fillText(l.emoji, 128, 140);
    g.font = `bold ${l.label.length > 10 ? 26 : 34}px ui-rounded, system-ui, sans-serif`; g.fillText(l.label, 128, 207);
  });
}
const SPOTS = L.stations.map(s => s.kind === 'link'
  ? { ...LINKS[s.idx], x: s.x, z: s.z }
  : { label: PROJECTS[s.idx].name, emoji: PROJECTS[s.idx].emoji, color: '#4f9d69', x: s.x, z: s.z, panel: true, proj: s.idx });
const stations = SPOTS.map(l => {
  mk(cyl(1.1, 1.3, .7, 32), M(0xefe3c8), [l.x, .35, l.z]);
  mk(new THREE.TorusGeometry(1.15, .09, 12, 40), M(l.color), [l.x, .72, l.z]).rotation.x = Math.PI / 2;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9), new THREE.MeshBasicMaterial({ map: badge(l), transparent: true, side: THREE.DoubleSide }));
  sign.position.set(l.x, 2.4, l.z); scene.add(sign);
  obstacles.push([l.x, l.z, 1.4]);
  return { ...l, sign, hover: false };
});

// ---- fishing, postcard, settings ----
const fishing = createFishing({ scene, pond: POND, toast, sound });
const act = () => nearby ? open(nearby) : pondNear && fishing.press();
let snap = false;
function takePhoto() {
  const c = document.createElement('canvas'); c.width = canvas.width; c.height = canvas.height;
  const g = c.getContext('2d'); g.drawImage(canvas, 0, 0);
  const h = c.height * .09; g.fillStyle = 'rgba(251,247,238,.92)'; g.fillRect(0, c.height - h, c.width, h);
  g.fillStyle = '#2f4a3a'; g.font = `800 ${h * .4}px ui-rounded, system-ui, sans-serif`; g.textAlign = 'center';
  g.fillText(`Erdian's little island · ${WX_NAME[wx].toLowerCase()} ${night ? 'night' : 'day'} · ${new Date().toLocaleDateString()}`, c.width / 2, c.height - h * .36);
  c.toBlob(async b => {
    const f = new File([b], 'island-postcard.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [f] })) { try { await navigator.share({ files: [f] }); return; } catch {} }
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = f.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  });
  toast('📸 Postcard saved');
}

// popovers: ☰ menu and ⚙️ settings, one open at a time
const POPS = { menu: [$('#menu'), $('#b-menu')], drawer: [$('#drawer'), $('#b-gear')] };
function closePops(except) { for (const [k, [p, b]] of Object.entries(POPS)) if (k !== except) { p.classList.add('hidden'); b.setAttribute('aria-expanded', 'false'); } }
function togglePop(k) { const [p, b] = POPS[k], open = p.classList.contains('hidden'); closePops(k); p.classList.toggle('hidden', !open); b.setAttribute('aria-expanded', open); }
$('#b-gear').onclick = e => { togglePop('drawer'); e.currentTarget.blur(); };
$('#b-menu').onclick = e => { togglePop('menu'); e.currentTarget.blur(); };
addEventListener('pointerdown', e => { for (const [p, b] of Object.values(POPS)) if (!p.classList.contains('hidden') && !p.contains(e.target) && !b.contains(e.target)) closePops(); }, true);

const press = (id, fn) => { $(id).onclick = e => { fn(e); e.currentTarget.blur(); }; };
press('#b-tod', toggleTod); press('#b-temp', toggleTemp);
press('#b-auto', () => { if (live) { unlive(); auto = true; } else auto = !auto; prefs.auto = auto; savePrefs(); toast(auto ? '🎲 Weather drifts by itself' : '🔒 Weather locked', '#8fa39a'); syncMood(); });
press('#b-live', () => { live ? unlive() : goLive(); });
strip.onclick = e => { const b = e.target.closest('button'); if (b) { setWeather(b.dataset.w, true); b.blur(); } };
press('#b-snd', () => { const on = sound.toggle(); $('#b-snd').textContent = on ? '🔊' : '🔇'; prefs.mute = !on; savePrefs(); });
if (prefs.mute) { sound.toggle(); $('#b-snd').textContent = '🔇'; }
press('#b-photo', () => { snap = true; closePops(); });
$('#b-lite').classList.toggle('on', !!lite); $('#b-lite').title = lite ? 'Lite graphics: on (tap to turn off)' : 'Lite graphics: off (tap to turn on)';
press('#b-lite', () => { prefs.lite = !lite; savePrefs(); location.reload(); });
press('#b-shuffle', () => { prefs.seed = 1 + Math.floor(Math.random() * 1e9); savePrefs(); location.reload(); });
press('#b-brain', () => { closePops(); openPanel($('#brain')); });

// ---- panels ----
let panelOpen = false, activePanel;
const panel = $('#projects');
$('#plist').innerHTML = PROJECTS.map(p => `<a class="proj" href="${p.url}" target="_blank" rel="noopener"><b>${p.emoji}</b><div><h3>${p.name}</h3><p>${p.desc}</p>${p.tags.map(t => `<i>${t}</i>`).join('')}</div><em>↗</em></a>`).join('');
function openPanel(el = panel) { closePops(); closeChat(); activePanel = el; panelOpen = true; el.classList.remove('hidden'); setTimeout(() => el.querySelector('.x').focus(), 60); }
function closePanel() { panelOpen = false; activePanel && activePanel.classList.add('hidden'); }
function openProject(i) {
  openPanel();
  const cards = document.querySelectorAll('.proj');
  cards.forEach((c, j) => c.classList.toggle('hl', j === i));
  cards[i] && cards[i].scrollIntoView({ block: 'nearest' });
}
[panel, $('#brain'), $('#dex'), $('#story-confirm'), $('#chars')].forEach(p => { p.querySelector('.x').onclick = closePanel; p.addEventListener('pointerdown', e => { if (e.target === p) closePanel(); }); });
const open = s => { sound.chime(); return s.panel ? openProject(s.proj) : window.open(s.url, '_blank', 'noopener'); };
$('#links').innerHTML = LINKS.map(l => `<a href="${l.url}" target="_blank" rel="noopener">${l.emoji} ${l.label}</a>`).join('');
$('#nav-proj').onclick = () => openPanel();
$('#nav-fish').onclick = () => { renderDex($('#dex-grid'), fishing.dex); openPanel($('#dex')); };
$('#nav-chars').onclick = () => { syncPicks(); openPanel($('#chars')); };
$('#nav-story').onclick = () => { $('#story-msg').textContent = ''; openPanel($('#story-confirm')); };
$('#story-no').onclick = closePanel;
$('#story-go').onclick = async () => {
  try { const r = await fetch('./story/index.html', { method: 'HEAD' }); if (!r.ok) throw 0; location.href = './story/'; }
  catch { $('#story-msg').textContent = 'Story mode isn’t built on this site yet. See the README for the one-time build.'; }
};
$('#menu').addEventListener('click', e => { if (e.target.closest('button,a')) closePops(); });

// ---- characters ----
const KINDS = {
  slime: { k: 's', c: 0x4fc4b0 },
  mochi: { k: 's', c: 0xffa6c9, ears: 1, blush: 0xf0568f },
  bot:   { k: 'b', c: 0xe8eef2, glow: 0x6ff3ff },
  pip:   { k: 'b', c: 0xffc2d9, glow: 0xff7fb0 },
};
const CHARS = [['slime', '🫧', 'Blobby'], ['mochi', '🍡', 'Mochi'], ['bot', '🤖', 'Bunbot']];
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
  if (o.crowned) mk(new THREE.ConeGeometry(.16, .2, 5), M(0xf0b030, .3), [0, KINDS[type].k === 'b' ? 1.65 : 1.25, 0], o.core);
  o.mesh.add(o.core);
}
function say(o, msg, hold) {
  if (EMO.includes(msg)) o.emo = 1.6;
  o.b.textContent = msg; o.b.classList.add('on'); o.b.classList.toggle('long', msg.length > 34);
  clearTimeout(o.to); o.to = setTimeout(() => o.b.classList.remove('on'), hold ?? 3200 + msg.length * 55);
}
// collisions: props and signs are solid circles, the island edge is a soft wall
function resolve(o) {
  const p = o.mesh.position;
  for (const [ox, oz, r] of obstacles) {
    const dx = p.x - ox, dz = p.z - oz, d = Math.hypot(dx, dz) || 1;
    if (d < r) { p.x = ox + dx / d * r; p.z = oz + dz / d * r; }
  }
  const d = Math.hypot(p.x, p.z);
  if (d > 13) { p.x *= 13 / d; p.z *= 13 / d; }
}
function step(o, mx, mz, dt, sp = 5) {
  const l = Math.hypot(mx, mz);
  o.moving = l > .05;
  if (!o.moving) return;
  const p = o.mesh.position, k = Math.min(l, 1);
  p.x += mx / l * sp * k * dt;
  p.z += mz / l * sp * k * dt;
  o.mesh.rotation.y += wrap(Math.atan2(mx, mz) - o.mesh.rotation.y) * (1 - Math.exp(-dt * 12));
  resolve(o);
}
function animate(o, dt, t) {
  o.vy -= 32 * dt; o.y += o.vy * dt;
  if (o.y <= 0) { if (o.vy < -4) o.land = .28; o.y = 0; o.vy = 0; }
  const air = o.y > .001, bot = KINDS[o.type].k === 'b';
  const hop = !air && o.moving ? Math.abs(Math.sin(t * 10)) * (bot ? .08 : .22) : 0;
  o.land *= Math.exp(-dt * 9);
  const s = air ? 1 + Math.min(Math.abs(o.vy) * .018, .25) : 1 - o.land + Math.sin(t * 3) * .015;
  if (o.emo > 0) { o.emo -= dt; o.core.rotation.y += dt * 9; } else o.core.rotation.y = 0;
  o.core.position.y = o.y + hop + (o.emo > 0 ? Math.abs(Math.sin(t * 9)) * .3 : 0) + (bot ? Math.sin(t * 3) * .04 : 0);
  o.core.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
  o.hands.forEach((h, i) => { h.position.z = .12 + (o.moving ? Math.sin(t * 10 + i * Math.PI) * .15 : 0); });
}
const tmp = new V();
function place(o) {
  tmp.copy(o.mesh.position); tmp.y += 1.7; tmp.project(camera);
  const x = (tmp.x * .5 + .5) * innerWidth, y = (-tmp.y * .5 + .5) * innerHeight;
  for (const e of [o.n, o.b]) { e.style.display = tmp.z > 1 ? 'none' : 'block'; e.style.transform = `translate(${x}px,${y}px) translate(-50%,-100%)`; }
}
const dropPlayer = o => { scene.remove(o.mesh); o.n.remove(); o.b.remove(); };
const net = createNet({
  make: (t, n) => makePlayer(KINDS[t] ? t : 'slime', n), retype: (o, t) => KINDS[t] && setType(o, t),
  say, drop: dropPlayer, count: n => { $('#b-net').innerHTML = `🌐<small>${n + 1}</small>`; $('#b-net').classList.add('on'); },
});
press('#b-net', async () => {
  const b = $('#b-net');
  if (net.on()) { net.leave(); b.innerHTML = '🌐'; b.classList.remove('on'); return; }
  b.innerHTML = '🌐<small>…</small>';
  try { await net.join(); } catch { b.innerHTML = '🌐'; b.title = 'Unavailable right now'; }
});

// ---- Pip and Momo: world chat, personalities, weather-aware behaviour ----
let state = 'intro', sel = prefs.avatar || 'slime', me, nextHop = 0, nearby = null, pondNear = false;
const npcs = [];
const where = k => {
  const s = shelters.find(x => x.k === k); if (!s || !me) return '';
  const p = me.mesh.position, dx = s.cx - p.x, dz = s.cz - p.z, f = -dx * Math.sin(yaw) - dz * Math.cos(yaw), r = dx * Math.cos(yaw) - dz * Math.sin(yaw);
  const ang = Math.atan2(r, f) * 180 / Math.PI, dirs = ['ahead', 'ahead-right', 'to your right', 'behind-right', 'behind you', 'behind-left', 'to your left', 'ahead-left'];
  return `${dirs[Math.round(ang / 45 + 8) % 8]}, ~${Math.max(1, Math.round(Math.hypot(dx, dz) / 1.1))} steps`;
};
const ai = initAI({
  know: [
    { k: ['who', 'erdian', 'bio', 'creator', 'owner'], a: 'Erdian builds things for the web. The Projects board has the details, and the links lead to his profiles.', short: 'erdian builds web things' }, // edit me
    { k: ['projects', 'project', 'work', 'working', 'built', 'made', 'portfolio'], a: 'Projects: ' + PROJECTS.map(p => p.name).join(', ') + '. Ask me about any of them!', short: 'projects: ' + PROJECTS.map(p => p.name).join(', ') },
    { k: ['contact', 'reach', 'email', 'hire', 'message', 'links'], a: 'Easiest is the sign posts on the island or the ☰ menu: ' + LINKS.map(l => l.label).join(', ') + '.', short: 'links are in the menu' },
    ...PROJECTS.map(p => ({ k: [p.name.toLowerCase(), ...p.name.toLowerCase().split(' '), ...p.tags.map(t => t.toLowerCase())], a: `${p.emoji} ${p.name}: ${p.desc} Built with ${p.tags.join(', ')}. ${p.url}`, short: `${p.name} is ${p.desc}` })),
    ...LINKS.map(l => ({ k: [l.label.toLowerCase()], a: `${l.emoji} ${l.label}: ${l.url}`, short: `${l.label} is at ${l.url}` })),
  ],
  facts: `Erdian's projects: ${PROJECTS.map(p => `${p.name}: ${p.desc} (${p.tags.join(', ')})`).join('; ')}. Links: ${LINKS.map(l => l.label).join(', ')}.`,
  ctx: () => ({ wx, wxName: WX_NAME[wx], icon: WX_ICON[wx], temp: currentTemp(), night, cold, sheltered: shel > .5, acorns: got.size, frozen: ice > .6, aurora: aurora > .5, where }),
});
const needShelter = n => n.who === 'pip' ? fx.rain > .25 || fx.snow > .3 || fx.storm > .2 || fx.heat > .6 : fx.storm > .5 || fx.snow > .55 || fx.heat > .8;
const shelterSpot = n => {
  const s = shelters.find(x => x.k === (n.who === 'pip' ? 'gazebo' : 'leanto')) || shelters[0];
  return s && s.slots[n.who === 'pip' ? 0 : 1];
};
const freeSpot = (cx, cz, r) => {
  for (let i = 0; i < 8; i++) {
    const a = rand(0, 6.283), d = r * Math.sqrt(Math.random()), x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    if (Math.hypot(x, z) < 11.5 && obstacles.every(([ox, oz, or]) => Math.hypot(x - ox, z - oz) > or + .6)) return new V(x, 0, z);
  }
  return new V(cx, 0, cz);
};
function npcTick(n, dt) {
  const o = n.o, p = o.mesh.position, mp = me.mesh.position;
  const face = (x, z, k = 8) => { o.mesh.rotation.y += wrap(Math.atan2(x - p.x, z - p.z) - o.mesh.rotation.y) * (1 - Math.exp(-dt * k)); };
  if (n.mode === 'come') {
    const d = Math.hypot(mp.x - p.x, mp.z - p.z);
    if (d > 2.3) step(o, mp.x - p.x, mp.z - p.z, dt, 4.6); else { o.moving = false; face(mp.x, mp.z); }
    n.near = d < 2.8; return;
  }
  if (n.mode === 'listen') { o.moving = false; face(mp.x, mp.z); if ((n.hold -= dt) <= 0) n.mode = 'wander'; return; }
  const sp = needShelter(n) ? shelterSpot(n) : null;
  if (sp) { // weather too rough: head for cover and stay there
    const dx = sp.x - p.x, dz = sp.z - p.z;
    if (Math.hypot(dx, dz) > .35) step(o, dx, dz, dt, 3.6); else { o.moving = false; face(0, 0); }
    n.t = 0; return;
  }
  if ((n.t -= dt) <= 0) {
    const stomp = n.who === 'momo' && fx.rain > .2 && puddles.length;
    if (stomp) { const q = pick(puddles).position; n.goal.set(q.x, 0, q.z); n.t = rand(2.5, 4.5); } // Momo loves puddles
    else { n.goal.copy(freeSpot(0, 3, 9)); n.t = rand(4, 8); if (Math.random() < .45) say(o, pick(NPC_LINES)); }
  }
  const dx = n.goal.x - p.x, dz = n.goal.z - p.z;
  if (Math.hypot(dx, dz) > .4) step(o, dx, dz, dt, 2.5);
  else { o.moving = false; if (n.who === 'momo' && fx.rain > .2 && o.y === 0 && Math.random() < dt * 2) { o.vy = 6.5; sound.pop(); } }
}
// "@Pip what's the weather?" → Pip walks over, thinks, answers in a bubble (Momo too, in a different voice)
async function converse(n, q) {
  if (!n) return;
  if (n.busy) return say(n.o, n.who === 'pip' ? 'One sec! 🐰' : 'hold on...');
  n.busy = true; n.mode = 'come'; n.near = false; say(n.o, '…', 9000);
  const t0 = performance.now();
  try {
    const arrive = new Promise(ok => { const id = setInterval(() => { if (n.near || performance.now() - t0 > 2800) { clearInterval(id); ok(); } }, 100); });
    const [txt] = await Promise.all([ai.reply(n.who, q, t => { n.o.b.textContent = t; n.o.b.classList.add('on'); n.o.b.classList.toggle('long', t.length > 34); }), arrive, new Promise(ok => setTimeout(ok, 700))]);
    say(n.o, txt); sound.pop(); sr.textContent = `${BUDDIES[n.who].name}: ${txt}`;
    n.hold = 2.5 + txt.length * .05;
  } catch { say(n.o, '…my brain hiccuped, try again?'); n.hold = 1; }
  n.mode = 'listen'; n.busy = false;
}
function handleChat(v) {
  say(me, v); net.say(v);
  // "@Pip what's the weather? @Momo any fish?" → each buddy gets the words after their own name
  const ms = [...v.matchAll(/@(pip|momo|all|everyone|both)\b/gi)], jobs = new Map();
  const lead = ms.length ? v.slice(0, ms[0].index).trim() : '';
  const segs = ms.map((m, i) => v.slice(m.index + m[0].length, i + 1 < ms.length ? ms[i + 1].index : undefined).trim());
  for (let i = segs.length - 1; i >= 0; i--) if (!segs[i]) segs[i] = segs[i + 1] || lead || 'hi';
  ms.forEach((m, i) => { const k = m[1].toLowerCase(); for (const w of k === 'pip' || k === 'momo' ? [k] : ['pip', 'momo']) jobs.set(w, segs[i]); });
  if (!jobs.size) { const s = v.match(/^\s*(?:hey |hi |yo |hello )?(pip|momo)\b[,!:?\s]*(.*)$/i); if (s) jobs.set(s[1].toLowerCase(), s[2].trim() || 'hi'); }
  for (const [w, q] of jobs) converse(npcs.find(n => n.who === w), q);
}

// ---- flow ----
const picksHTML = CHARS.map(([t, e, n]) => `<button class="pick" data-t="${t}"><b>${e}</b>${n}</button>`).join('');
$('#picks').innerHTML = $('#picks2').innerHTML = picksHTML;
const syncPicks = () => document.querySelectorAll('.pick').forEach(x => x.classList.toggle('on', x.dataset.t === sel));
document.querySelectorAll('.pick').forEach(b => b.onclick = () => {
  sel = b.dataset.t; me && setType(me, sel); syncPicks(); b.blur();
  if (b.closest('#chars')) { prefs.avatar = sel; savePrefs(); closePanel(); toast(`${b.firstElementChild.textContent} Saved for next time`); }
});
if (prefs.avatar) { const c = CHARS.find(x => x[0] === prefs.avatar); if (c) $('#again').textContent = `Welcome back · playing as ${c[1]} ${c[2]} (change in ☰)`; }
function beginPlay() {
  state = 'play'; $('#pick').classList.add('hidden'); $('#hud').classList.remove('hidden'); $('#b-menu').classList.remove('hidden');
  prefs.avatar = sel; savePrefs(); if (location.hash.includes('projects')) setTimeout(() => openPanel(), 900);
  me.mesh.position.set(0, 0, 0); me.mesh.rotation.y = Math.PI;
  [['pip', 'pip', 'Pip'], ['mochi', 'momo', 'Momo']].forEach(([t, who, name], i) => {
    const o = makePlayer(t, name), q = who === 'pip' ? freeSpot(3.5, 2, 1.5) : freeSpot(POND.x + 3, POND.z, 1.5);
    o.mesh.position.copy(q); npcs.push({ o, who, goal: q.clone(), t: rand(1, 4), mode: 'wander', hold: 0, busy: false, near: false });
    setTimeout(() => say(o, NPC_LINES[i]), 1500 + i * 1200);
  });
  if (coarse) toast('👈 left side moves · right side looks 👉', '#7fb0d6');
  setTimeout(() => toast('💬 Tip: type @Pip or @Momo to talk to them', '#7fb0d6'), 2500);
}
$('#go').onclick = () => {
  sound.start(); $('#intro').classList.add('hidden');
  me = makePlayer(sel, 'You'); if (got.size >= 5) { me.crowned = true; setType(me, sel); }
  if (prefs.avatar) return beginPlay(); // returning visitor: straight in with the saved buddy
  state = 'pick'; $('#pick').classList.remove('hidden'); syncPicks();
};
$('#start').onclick = beginPlay;

// ---- input: WASD / analog stick (left half) · look-around (right half) · taps open signs and call buddies ----
const keys = new Set();
let yaw = 0, pitch = .3, dist = 9, joy = { x: 0, y: 0 };
const jump = () => { if (me && me.y === 0 && !panelOpen) { me.vy = 11; sound.jump(); } };
const chat = $('#chat'), msg = $('#msg');
function openChat(pre) { if (state !== 'play' || panelOpen) return; closePops(); keys.clear(); chat.classList.remove('hidden'); $('#b-chat').classList.add('on'); if (pre) msg.value = pre; msg.focus(); }
function closeChat() { chat.classList.add('hidden'); $('#b-chat').classList.remove('on'); msg.blur(); }
$('#b-chat').onclick = () => chat.classList.contains('hidden') ? openChat() : closeChat();
chat.addEventListener('submit', e => { e.preventDefault(); const v = msg.value.trim(); msg.value = ''; closeChat(); if (v) handleChat(v); });
$('#quick').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.e) { say(me, b.dataset.e); net.say(b.dataset.e); } else { msg.value = b.dataset.ins + msg.value.replace(/^@\w+\s*/, ''); msg.focus(); }
});
msg.addEventListener('keydown', e => { if (e.key === 'Escape') closeChat(); });
addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (panelOpen) return closePanel(); closePops(); }
  if (/INPUT|SELECT/.test(e.target.tagName) || panelOpen) return;
  const k = e.key.toLowerCase();
  if (k === 'n') toggleTod();
  if (k === 't') toggleTemp();
  if (state !== 'play') return;
  if (k === 'e') act();
  if (e.code === 'Space') { e.preventDefault(); jump(); }
  if (e.key === 'Enter') { e.preventDefault(); openChat(); }
  keys.add(k);
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => { keys.clear(); endStick(); look = null; });
$('#jump').addEventListener('pointerdown', jump);
$('#prompt').onclick = e => { act(); e.currentTarget.blur(); };

const joyEl = $('#joy'), knob = joyEl.firstElementChild, JR = 46;
let stick = null, look = null, tap = null;
function startStick(e) {
  const x = clamp(e.clientX, 70, innerWidth / 2 - 10), y = clamp(e.clientY, 70, innerHeight - 70);
  stick = { id: e.pointerId, x, y };
  Object.assign(joyEl.style, { left: x - 60 + 'px', top: y - 60 + 'px', bottom: 'auto' }); joyEl.classList.add('on');
}
function moveStick(e) {
  let dx = e.clientX - stick.x, dy = e.clientY - stick.y;
  const d = Math.hypot(dx, dy); if (d > JR) { dx *= JR / d; dy *= JR / d; }
  knob.style.transform = `translate(${dx}px,${dy}px)`;
  const m = Math.hypot(dx, dy) / JR, k = m < .12 ? 0 : (m - .12) / .88; // dead zone, then analog 0..1
  joy = m ? { x: dx / JR / m * k, y: dy / JR / m * k } : { x: 0, y: 0 };
}
function endStick() { stick = null; joy = { x: 0, y: 0 }; knob.style.transform = ''; joyEl.classList.remove('on'); joyEl.style.left = joyEl.style.top = joyEl.style.bottom = ''; }
const ray = new THREE.Raycaster(), mp = new THREE.Vector2();
const aim = e => { mp.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(mp, camera); };
const hitSign = e => { aim(e); const h = ray.intersectObjects(stations.map(s => s.sign))[0]; return h && stations.find(s => s.sign === h.object); };
const hitNpc = e => { aim(e); const h = ray.intersectObjects(npcs.map(n => n.o.mesh), true)[0]; if (!h) return; let o = h.object; while (o) { const n = npcs.find(q => q.o.mesh === o); if (n) return n; o = o.parent; } };
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointerdown', e => {
  if (state !== 'play' || panelOpen) return;
  closePops();
  if (!chat.classList.contains('hidden') && coarse) closeChat();
  try { canvas.setPointerCapture(e.pointerId); } catch {}
  tap = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() };
  if (e.button === 0 && e.clientX < innerWidth / 2 && !stick) { startStick(e); moveStick(e); }
  else if (!look) { look = { id: e.pointerId, x: e.clientX, y: e.clientY }; canvas.style.cursor = 'grabbing'; }
});
canvas.addEventListener('pointermove', e => {
  if (state !== 'play') return;
  if (stick && e.pointerId === stick.id) moveStick(e);
  else if (look && e.pointerId === look.id) {
    yaw -= (e.clientX - look.x) * .005; pitch = clamp(pitch + (e.clientY - look.y) * .005, .02, 1.2);
    look.x = e.clientX; look.y = e.clientY;
  } else if (!stick && !look && e.pointerType === 'mouse') {
    const s = hitSign(e); stations.forEach(x => x.hover = x === s);
    canvas.style.cursor = s || hitNpc(e) ? 'pointer' : 'grab';
  }
});
const release = e => {
  if (stick && e.pointerId === stick.id) endStick();
  if (look && e.pointerId === look.id) { look = null; canvas.style.cursor = 'grab'; }
  if (tap && tap.id === e.pointerId && e.type === 'pointerup' && state === 'play' && !panelOpen && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 8 && performance.now() - tap.t < 300) {
    const s = hitSign(e), n = !s && hitNpc(e); // a quick tap never moves you: it opens a sign or calls a buddy
    if (s) open(s); else if (n) openChat(`@${BUDDIES[n.who].name} `);
  }
  if (tap && tap.id === e.pointerId) tap = null;
};
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);
canvas.addEventListener('wheel', e => { dist = clamp(dist + e.deltaY * .01, 5, 14); }, { passive: true });
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

// ---- loop ----
let lastSk = '', stepT = 0, chipT = 0, envT = 0, driftT = rand(70, 130), strikeT = 3, boltT = 0, bolt2 = false, rbT = 0, wasRain = fx.rain > .3;
const thunders = [], tmpGrey = new THREE.Color();
const clock = new THREE.Clock(), look3 = new V(0, 1, 0), pv = new V(), c1 = new THREE.Color();
const WHITE = new THREE.Color(0xffffff), DG = new THREE.Color(0x8f98a3), NG = new THREE.Color(0x1a1f30), WARMSKY = new THREE.Color(0xf4dba8), DRYG = new THREE.Color(0xb9b45e), DRYL = new THREE.Color(0xa8a23e), FLASHC = new THREE.Color(0xdfe8ff), CLOUDDARK = new THREE.Color(0x3d4350);
const vis = y => clamp((y + 4) / 14, 0, 1);
function strike() {
  const p = me ? me.mesh.position : { x: 0, z: 0 }, a = Math.atan2(-Math.sin(yaw), -Math.cos(yaw)) + rand(-.9, .9), d = rand(26, 48); // somewhere in front of the camera
  const bx = p.x + Math.sin(a) * d, bz = p.z + Math.cos(a) * d;
  for (let i = 0; i < 14; i++) { bPos[i * 3] = bx + (i ? rand(-2.5, 2.5) : 0); bPos[i * 3 + 1] = 40 - i * 3.1; bPos[i * 3 + 2] = bz; }
  bGeo.attributes.position.needsUpdate = true; bolt.visible = true; boltT = .16; bolt2 = !reduce; flash = reduce ? .25 : 1;
  thunders.push({ t: .25 + d * .022, p: rand(.7, 1) });
}
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;

  // ease the weather numbers and the slow world variables
  const W = WX[wx], a = 1 - Math.exp(-dt * 2.2), a2 = 1 - Math.exp(-dt * .7);
  for (const k in W) fx[k] += (W[k] - fx[k]) * a2;
  const raining = fx.rain > .3;
  if (wasRain && !raining && !night && !cold) rbT = 90; // rainbow after the rain
  wasRain = raining;
  wet += ((fx.rain > .05 ? 1 : 0) - wet) * (1 - Math.exp(-dt * (fx.rain > .05 ? .25 : .03)));
  snowCover += ((fx.snow > .1 ? .95 : 0) - snowCover) * (1 - Math.exp(-dt * (fx.snow > .1 ? .05 : cold ? .004 : .05)));
  ice += ((cold && fx.heat < .3 ? 1 : 0) - ice) * (1 - Math.exp(-dt * .12));
  nightMix += ((night ? 1 : 0) - nightMix) * a;
  phase += (phaseT - phase) * (1 - Math.exp(-dt * 1.6));
  const auroraT = nightMix > .6 && cold && fx.cloud < .4 && fx.rain < .05 && fx.snow < .05 && fx.fogN > 30 ? 1 : 0;
  aurora += (auroraT - aurora) * a2;
  flash = Math.max(0, flash - dt * 4.5);

  // lightning
  if (fx.storm > .6 && state === 'play' && (strikeT -= dt) <= 0) { strike(); strikeT = rand(5, 13); }
  if (boltT > 0) { boltT -= dt; if (bolt2 && boltT < .08) { bolt2 = false; flash = Math.max(flash, .7); } if (boltT <= 0) bolt.visible = false; }
  for (let i = thunders.length - 1; i >= 0; i--) if ((thunders[i].t -= dt) <= 0) { sound.thunder(thunders[i].p); thunders.splice(i, 1); }

  // palette + weather tint
  const T = PAL[key()];
  CK.forEach(k => {
    c1.set(T[k]);
    if (k === 'sky') { c1.lerp(WARMSKY, fx.heat * .3 * (1 - nightMix)); c1.lerp(tmpGrey.copy(DG).lerp(NG, nightMix), fx.gloom * .72); }
    cur[k].lerp(c1, a);
  });
  cur.hi += (T.hi - cur.hi) * a; cur.si += (T.si - cur.si) * a;
  bg.copy(cur.sky); if (flash > 0) bg.lerp(FLASHC, Math.min(flash, 1) * .7);
  scene.background = bg; scene.fog.color.copy(bg); scene.fog.near = fx.fogN; scene.fog.far = fx.fogF;
  hemi.color.copy(cur.hs); hemi.groundColor.copy(cur.hg); hemi.intensity = cur.hi * (.45 + .55 * fx.lit) + flash * 2.2;
  sun.color.copy(cur.sun); sun.intensity = cur.si * fx.lit + flash * 1.5;
  grassM.userData.base.copy(cur.grass).lerp(DRYG, fx.heat * .55).multiplyScalar(1 - wet * .22); grassM.roughness = .9 - wet * .35;
  dirtM.userData.base.copy(cur.dirt).multiplyScalar(1 - wet * .25);
  PR.MATS.leaf.forEach((m, i) => m.userData.base.copy(cur.leaf).offsetHSL(0, 0, (i - 1) * .05).lerp(DRYL, fx.heat * .3).multiplyScalar(1 - wet * .12));
  PR.MATS.pine.forEach((m, i) => m.userData.base.copy(cur.leaf).offsetHSL(.02, -.05, -.1 - i * .04).multiplyScalar(1 - wet * .1));
  for (const m of PR.SNOWY) m.color.copy(m.userData.base).lerp(WHITE, snowCover * m.userData.k);
  waterM.color.copy(cur.water).lerp(DG, fx.gloom * .3);
  cloudM.color.copy(cur.cloud).lerp(CLOUDDARK, fx.gloom * .75 * (1 - nightMix * .5));

  // sky bodies hide behind cloud
  sunS.position.set(Math.cos(phase) * 40, Math.sin(phase) * 70, -70);
  moonS.position.set(Math.cos(phase + Math.PI) * 40, Math.sin(phase + Math.PI) * 70, -70);
  sunS.material.opacity = vis(sunS.position.y) * (1 - fx.cloud * .8) * (1 - (wx === 'fog') * .5); moonS.material.opacity = vis(moonS.position.y) * (1 - fx.cloud * .7);
  sunS.material.color.copy(cur.sun); moonS.material.color.copy(cur.sun);
  starM.opacity = nightMix * .9 * (1 - fx.cloud * .9);
  sun.position.copy(sunS.position).lerp(moonS.position, nightMix).normalize();
  sun.position.y = Math.max(sun.position.y, .35); sun.position.normalize().multiplyScalar(24);
  auroraM.material.opacity = aurora * (.55 + .15 * Math.sin(t * .7)); auroraM.visible = aurora > .01;
  if (auroraM.visible) {
    auroraTex.offset.x = t * .006;
    for (let i = 0; i < aPos.count; i++) { const top = i < 41, x = aBase[i * 3]; aPos.setY(i, aBase[i * 3 + 1] + (top ? Math.sin(x * .13 + t * .6) * 2.4 + Math.sin(x * .31 - t * .9) * 1 : Math.sin(x * .2 - t * .4) * .7)); }
    aPos.needsUpdate = true;
  }

  // precipitation + drifting particles
  const wv = fx.wind, snowA = clamp(fx.snow, 0, 1), leafA = clamp((wv - .55) * 2.5, 0, 1) * (1 - fx.rain) * (1 - snowA);
  const flyA = nightMix > .5 && !cold && fx.rain < .2 && snowA < .1 ? 1 : 0;
  const mode = snowA > .05 ? 0 : leafA > .25 && nightMix < .5 ? 1 : flyA ? 2 : 3;
  pMat.color.lerp(c1.set(mode === 0 ? 0xffffff : mode === 1 ? 0xc9b23a : 0xffe27a), a);
  pMat.size += ((mode === 0 ? .16 : mode === 1 ? .28 : .22) - pMat.size) * a;
  pMat.opacity += ((mode === 0 ? .5 + .45 * snowA : mode === 1 ? .85 : mode === 2 ? 1 : 0) - pMat.opacity) * a;
  for (let i = 0; i < N; i++) {
    const j = i * 3;
    if (mode === 0) { pa[j + 1] -= (1.2 + snowA * 1.3) * dt; pa[j] += (Math.sin(t + seed[i]) * .4 + WD.x * wv * 3) * dt; pa[j + 2] += WD.z * wv * 3 * dt; if (pa[j + 1] < 0) pa[j + 1] = 14; }
    else if (mode === 1) { pa[j] += (WD.x * (4 + wv * 7) + Math.sin(t * 3 + seed[i]) * .8) * dt; pa[j + 2] += WD.z * (4 + wv * 7) * dt; pa[j + 1] = clamp(pa[j + 1] + Math.sin(t * 2 + seed[i]) * 1.4 * dt - .25 * dt, .4, 9); }
    else { pa[j + 1] = clamp(pa[j + 1] + Math.sin(t * .7 + seed[i]) * .25 * dt, .4, 5); pa[j] += (Math.cos(t * .5 + seed[i]) * .3 + WD.x * wv * 2) * dt; pa[j + 2] += WD.z * wv * 2 * dt; }
    if (pa[j] > 22) pa[j] = -22; else if (pa[j] < -22) pa[j] = 22; if (pa[j + 2] > 22) pa[j + 2] = -22; else if (pa[j + 2] < -22) pa[j + 2] = 22;
    if (mode < 2) for (const s of shelters) if (pa[j + 1] < s.roofY && Math.hypot(pa[j] - s.cx, pa[j + 2] - s.cz) < s.r + .3) { pa[j + 1] = 14; break; }
  }
  pGeo.attributes.position.needsUpdate = true;
  rMat.opacity += (clamp(fx.rain, 0, 1) * .55 * (night ? .8 : 1) - rMat.opacity) * a;
  const nr = Math.ceil(RN * clamp(fx.rain * 1.2, 0, 1)), vx = WD.x * wv * 5, vz = WD.z * wv * 5, vy = -22;
  rGeo.setDrawRange(0, nr * 2);
  if (nr) {
    for (let i = 0; i < nr; i++) {
      const j = i * 3, k = i * 6;
      rh[j] += vx * dt; rh[j + 1] += vy * dt; rh[j + 2] += vz * dt;
      let dead = rh[j + 1] < 0;
      if (!dead) for (const s of shelters) if (rh[j + 1] < s.roofY && Math.hypot(rh[j] - s.cx, rh[j + 2] - s.cz) < s.r + .25) { dead = true; break; }
      if (dead) { rh[j] = rand(-22, 22); rh[j + 1] = rand(12, 15); rh[j + 2] = rand(-22, 22); }
      rl[k] = rh[j]; rl[k + 1] = rh[j + 1]; rl[k + 2] = rh[j + 2];
      rl[k + 3] = rh[j] - vx * .035; rl[k + 4] = rh[j + 1] - vy * .035; rl[k + 5] = rh[j + 2] - vz * .035;
    }
    rGeo.attributes.position.needsUpdate = true;
  }

  // clouds: cover, speed and darkness follow the weather
  clouds.rotation.y += dt * (.012 + wv * .05);
  cloudList.forEach((c, i) => c.scale.setScalar(Math.max(.001, clamp(fx.cloud * 12.5 - i * .9, 0, 1))));

  // living things react to wind, rain, snow, heat
  const lean = wv * .07, closeAmt = clamp(nightMix * .6 + fx.rain * .7 + snowA * .5, 0, .9);
  for (const o of swayList) {
    const s = o.userData.sway, f = 1.1 + wv * 2.2;
    o.rotation.z = -WD.x * lean * s.amp + Math.sin(t * f + s.ph) * (.012 + wv * .035) * s.amp;
    o.rotation.x = WD.z * lean * s.amp + Math.cos(t * f * .8 + s.ph) * (.008 + wv * .025) * s.amp;
  }
  for (const g of flowers) { g.userData.head.scale.setScalar(1 - closeAmt * .5); g.scale.y = (1 - fx.heat * .25) * (1 - snowCover * .65); }
  for (const w of windmills) w.userData.hub.rotation.z -= dt * (.35 + wv * 3.4);
  const lampOn = clamp(Math.max(nightMix * .95, fx.gloom * .8), 0, 1);
  PR.MATS.lamp.emissiveIntensity = lampOn * 2;
  let warmth = false;
  for (const f of fires) {
    const lit = sheltered(f.x, f.z) ? 1 : clamp(1 - fx.rain * 1.4, 0, 1), fl = f.o.userData.flames;
    fl.forEach((m, i) => { m.visible = lit > .05; m.scale.set(1, (.75 + .35 * Math.sin(t * 9 + i * 2)) * lit, 1); });
    fireLight.intensity = lit * (1 + nightMix * 2.4 + fx.gloom * 1.3 + (cold ? .8 : 0)) * (.9 + .1 * Math.sin(t * 13));
    if (state === 'play' && lit > .3 && Math.hypot(me.mesh.position.x - f.x, me.mesh.position.z - f.z) < 3.2) warmth = true;
  }
  const rip = clamp(fx.rain * 1.4, 0, 1);
  PR.MATS.puddle.opacity = clamp(wet * .6, 0, .6) * (1 - snowCover);
  for (const [i, g] of puddles.entries()) { const r = g.userData.ripple, u = (t * .9 + i * .37) % 1; r.scale.setScalar(g.userData.s * (.15 + u * .7)); r.material.opacity = (1 - u) * .55 * rip; }
  pondMesh.scale.set(1 - fx.heat * .07, 1, 1 - fx.heat * .07);
  iceM.opacity = ice * .92; iceMesh.visible = ice > .02;
  for (const r of pondRipples) { const u = (t * 1.1 + r.userData.ph) % 1; if (u < r.userData.u) r.position.set(POND.x + rand(-1.8, 1.8) * .9, .1, POND.z + rand(-1.8, 1.8) * .9); r.userData.u = u; r.scale.setScalar(.05 + u * .5); r.material.opacity = (1 - u) * .5 * rip * (1 - ice); r.visible = rip > .02; }

  // camera + mood-driven sound
  const sk = key() + wx; if (sk !== lastSk) { lastSk = sk; sound.set(night, cold, wx); }
  if ((envT -= dt) <= 0) { envT = .25; sound.env({ rain: fx.rain, snow: fx.snow, wind: fx.wind, shelter: shel, heat: fx.heat }); }
  if (state === 'play' && me.moving && me.y === 0 && (stepT -= dt) <= 0) { sound.step(cold || snowA > .1, wet > .5 && snowCover < .3 && !sheltered(me.mesh.position.x, me.mesh.position.z)); stepT = .32; }
  stations.forEach((s, i) => {
    s.sign.position.y = 2.4 + Math.sin(t * 2 + i) * .12;
    s.sign.lookAt(camera.position);
    const k = s.hover ? 1.14 : 1;
    s.sign.scale.lerp(pv.set(k, k, k), 1 - Math.exp(-dt * 10));
  });

  for (const s of shelters) { // roofs turn see-through when the camera is close or you stand under them
    const d = Math.hypot(camera.position.x - s.cx, camera.position.y - 1.5, camera.position.z - s.cz), under = me && Math.hypot(me.mesh.position.x - s.cx, me.mesh.position.z - s.cz) < s.r + .4;
    s.fade += ((under ? .22 : clamp((d - 3) / 5, .15, 1)) - s.fade) * (1 - Math.exp(-dt * 6));
    for (const m of s.mats) { m.opacity = s.fade; m.depthWrite = s.fade > .85; }
  }
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
    const inShelter = sheltered(p.x, p.z);
    shel += ((inShelter ? 1 : 0) - shel) * (1 - Math.exp(-dt * 6));
    step(me, ix * cy - iz * sy, -ix * sy - iz * cy, dt, 5 * fx.spd * (1 - snowCover * .1));
    if (wv > .5 && !inShelter && !panelOpen) { const push = (wv - .45) * 2.2; p.x += WD.x * push * dt; p.z += WD.z * push * dt; resolve(me); } // gusts shove you, roofs stop them
    tp = [p.x + sy * cp * dist, Math.sin(pitch) * dist + 1, p.z + cy * cp * dist]; tl = [p.x, 1.1, p.z];

    nearby = null;
    let best = 2.8;
    for (const s of stations) { const d = Math.hypot(p.x - s.x, p.z - s.z); if (d < best) { best = d; nearby = s; } }
    const pr = $('#prompt');
    pondNear = !nearby && Math.hypot(p.x - POND.x, p.z - POND.z) < POND.r + 1.8;
    if (!pondNear && fishing.active()) fishing.cancel();
    pr.classList.toggle('hidden', !(nearby || pondNear) || panelOpen);
    if (nearby) pr.textContent = `${nearby.emoji} Open ${nearby.label}${coarse ? '' : ' · E'}`;
    else if (pondNear) pr.textContent = fishing.label() + (coarse ? '' : ' · E');
    fishing.setCond({
      bite: fx.fish * (night ? 1.1 : 1), luck: 1 + fx.rain * .6 + nightMix * .25 + aurora * 1.2, swim: cold ? .5 : 1,
      blocked: ice > .6 ? 'The pond is frozen' : fx.storm > .5 ? 'Too stormy to fish' : '',
    });

    for (const n of npcs) npcTick(n, dt);
    if (auto && !live && (driftT -= dt) <= 0) { driftT = rand(70, 140); setWeather(nextWx(wx, cold)); }
    if ((chipT -= dt) <= 0) {
      chipT = .4;
      const aur = aurora > .5, icon = aur ? '🌌' : wx === 'clear' && night ? '🌙' : WX_ICON[wx], name = aur ? 'Aurora' : WX_NAME[wx];
      const bad = fx.rain > .2 || snowA > .2 || fx.wind > .6 || fx.heat > .5;
      const s = `${icon} ${name} · ${currentTemp()}°${inShelter && bad ? ' · 🏠 Sheltered' : ''}${warmth && cold ? ' · 🔥 Warm' : ''}`;
      if (s !== lastChip) $('#wx').textContent = lastChip = s;
    }
  }
  const k = 1 - Math.exp(-dt * (state === 'play' ? 8 : 3));
  camera.position.lerp(pv.set(...tp), k);
  look3.lerp(pv.set(...tl), k);
  if (!reduce && fx.storm > .3) camera.position.add(pv.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(.04 * fx.storm));
  camera.lookAt(look3);

  worldFx(dt, t); fishing.update(dt, t);
  net.tick(dt, me, state === 'play');
  for (const o of [me, ...npcs.map(n => n.o), ...net.list()]) if (o) { animate(o, dt, t); if (state !== 'intro') place(o); }
  renderer.render(scene, camera);
  if (snap) { snap = false; takePhoto(); }
});
function worldFx(dt, t) {
  rbT = Math.max(0, rbT - dt);
  const ro = clamp(rbT / 8, 0, 1) * .5; rb.children.forEach(r => r.material.opacity = ro);
  if (mt < 0 && night && fx.cloud < .5 && fx.rain < .05 && fx.snow < .05 && fx.fogN > 30 && Math.random() < dt * .12) { mt = 0; meteor.position.set(rand(-30, 40), rand(40, 60), -80); mv.set(-70, -28, 0); }
  if (mt >= 0) { mt += dt; meteor.position.addScaledVector(mv, dt); meteor.material.opacity = Math.sin(Math.PI * Math.min(mt, 1)); if (mt > 1) { mt = -1; meteor.material.opacity = 0; } }
  if (state !== 'play') return;
  acorns.forEach((g, i) => {
    g.rotation.y += dt * 2; g.position.y = .5 + Math.sin(t * 2.5 + i) * .1;
    if (g.visible && Math.hypot(me.mesh.position.x - g.position.x, me.mesh.position.z - g.position.z) < 1.3) {
      g.visible = false; got.add(i); ls.set('island.acorns', JSON.stringify([...got]));
      sound.chime(); toast(`🌰 Golden acorn ${got.size}/5`, '#f0b030');
      if (got.size === 5) { me.crowned = true; setType(me, me.type); toast('👑 All five found! Crown unlocked', '#f0b030'); }
    }
  });
}
