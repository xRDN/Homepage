// The sky: a gradient dome behind everything (replaces the flat background colour), plus the special sky events:
// sunset glow, a meteor shower, a "cosmic" night (nebula, milky-way band, a ringed planet) and the aurora (lives in main.js).
// main.js decides what the sky should look like each frame and passes colours and weights to update().
import * as THREE from 'three';

const VERT = /* glsl */`
varying vec3 vDir;
void main() { vDir = position; vec4 p = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * p; }`;

const FRAG = /* glsl */`
uniform vec3 uTop, uHorizon, uBottom, uSunDir, uSunCol;
uniform float uGlow, uCosmic, uTime;
varying vec3 vDir;
float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
void main() {
  vec3 d = normalize(vDir); float h = d.y;
  vec3 col = mix(uHorizon, uTop, smoothstep(-0.02, 0.6, h));
  col = mix(col, uBottom, smoothstep(0.0, -0.3, h));
  float s = max(dot(d, normalize(uSunDir)), 0.0);
  col += uSunCol * (pow(s, 6.0) * 0.45 + pow(s, 48.0) * 0.6) * uGlow;                 // warm halo around a low sun
  col += uSunCol * 0.35 * uGlow * (1.0 - smoothstep(0.0, 0.25, abs(h))) * (0.4 + 0.6 * s); // glowing horizon band
  if (uCosmic > 0.001) {
    vec3 q = d * 2.6 + vec3(0.0, 0.0, uTime * 0.004);
    float n = fbm(q), m = fbm(q * 1.7 + 4.0);
    float band = exp(-pow(dot(d, normalize(vec3(0.35, 0.75, 0.55))) * 3.0, 2.0));      // the milky way
    vec3 neb = mix(vec3(0.42, 0.10, 0.62), vec3(0.06, 0.55, 0.70), m) * pow(n, 2.2) * 1.9;
    neb += vec3(1.0, 0.55, 0.75) * pow(max(n - 0.45, 0.0), 2.0) * 3.0;
    neb += vec3(0.85, 0.80, 1.0) * band * (0.18 + 0.5 * pow(n, 3.0));
    col += neb * uCosmic * smoothstep(-0.05, 0.25, h);
  }
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };

export function createSky(scene, { lite = false } = {}) {
  // ---- gradient dome (follows the camera, drawn first, never writes depth) ----
  const U = {
    uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uBottom: { value: new THREE.Color() },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color(0xff9a5a) },
    uGlow: { value: 0 }, uCosmic: { value: 0 }, uTime: { value: 0 },
  };
  const dome = new THREE.Mesh(new THREE.SphereGeometry(150, 48, 24), new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERT, fragmentShader: FRAG, side: THREE.BackSide, depthWrite: false, fog: false }));
  dome.renderOrder = -10; dome.frustumCulled = false; scene.add(dome);

  // ---- ringed planet for cosmic nights ----
  const planet = new THREE.Group();
  const pTex = canvasTex(256, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); [['#f3c38f', 0], ['#d98a6a', .25], ['#f7dcb0', .45], ['#c46f5c', .6], ['#eab48a', .8], ['#a8576a', 1]].forEach(([c, o]) => gr.addColorStop(o, c)); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const pMat = new THREE.MeshBasicMaterial({ map: pTex, fog: false, transparent: true, opacity: 0, depthWrite: false });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(6, 32, 16), pMat); planet.add(ball);
  const rTex = canvasTex(256, 8, (g, w) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(255,230,200,0)'); gr.addColorStop(.25, 'rgba(255,225,190,.75)'); gr.addColorStop(.5, 'rgba(220,170,150,.35)'); gr.addColorStop(.7, 'rgba(255,235,210,.8)'); gr.addColorStop(1, 'rgba(255,230,200,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, 8); });
  const ringGeo = new THREE.RingGeometry(8, 13, 64, 1);
  { const p = ringGeo.attributes.position, uv = ringGeo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, (Math.hypot(p.getX(i), p.getY(i)) - 8) / 5, .5); } // radial UVs
  const rMat = new THREE.MeshBasicMaterial({ map: rTex, fog: false, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(ringGeo, rMat); ring.rotation.x = Math.PI / 2 - .35; planet.add(ring);
  planet.position.set(-55, 48, -100); planet.rotation.z = .3; planet.renderOrder = -5; ball.renderOrder = ring.renderOrder = -5; planet.visible = false; scene.add(planet);

  // ---- shooting stars: a small pool of streaks oriented along their flight ----
  const sTex = canvasTex(256, 16, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.85, 'rgba(220,235,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,1)'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w - 6, 2); g.arc(w - 6, h / 2, h / 2 - 2, -Math.PI / 2, Math.PI / 2); g.closePath(); g.fill(); });
  const pool = Array.from({ length: lite ? 6 : 12 }, () => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: sTex, transparent: true, opacity: 0, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    m.visible = false; m.renderOrder = -4; m.frustumCulled = false; scene.add(m); return { m, v: new THREE.Vector3(), life: 0, age: 0, len: 8 };
  });
  const X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3(), B = new THREE.Matrix4();
  const F = new THREE.Vector3(), R = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  let cam = null;
  function launch(big) {
    const s = pool.find(p => !p.m.visible); if (!s || !cam) return;
    // spawn in the part of the sky you are looking at; all streaks fall the same way, as if from one radiant (like a real shower)
    cam.getWorldDirection(F); F.y = 0; if (F.lengthSq() < 1e-4) F.set(0, 0, -1); F.normalize(); R.crossVectors(F, UP);
    s.m.position.copy(cam.position).addScaledVector(F, 75 + Math.random() * 20).addScaledVector(R, (Math.random() - .3) * 90); s.m.position.y = 32 + Math.random() * 38;
    s.v.copy(R).multiplyScalar(-1 - Math.random() * .4).addScaledVector(UP, -.4 - Math.random() * .35).addScaledVector(F, (Math.random() - .5) * .3).normalize().multiplyScalar(45 + Math.random() * 35);
    s.life = .7 + Math.random() * .7; s.age = 0; s.len = big ? 22 : 11 + Math.random() * 7;
    s.m.material.color.set(big ? 0xc8ffd8 : Math.random() < .3 ? 0xffe6c0 : 0xffffff); s.big = big; s.m.visible = true;
  }

  return {
    dome,
    /**
     * @param o.cam camera, o.t time, o.dt delta
     * @param o.top/horizon/bottom THREE.Color   o.sunDir Vector3   o.glow 0..1 (sunset)   o.cosmic 0..1
     * @param o.rate shooting stars per second (0 = none)
     */
    update(o) {
      cam = o.cam; dome.position.copy(o.cam.position);
      U.uTop.value.copy(o.top); U.uHorizon.value.copy(o.horizon); U.uBottom.value.copy(o.bottom);
      U.uSunDir.value.copy(o.sunDir); U.uGlow.value = o.glow; U.uCosmic.value = o.cosmic; U.uTime.value = o.t;
      if (o.sunCol) U.uSunCol.value.copy(o.sunCol);
      planet.visible = o.cosmic > .01; pMat.opacity = o.cosmic; rMat.opacity = o.cosmic * .9; ball.rotation.y = o.t * .02;
      if (o.rate > 0 && Math.random() < o.rate * o.dt) launch(Math.random() < .07); // Poisson: follows the rate as a shower builds up and fades
      for (const s of pool) {
        if (!s.m.visible) continue;
        s.age += o.dt; const u = s.age / s.life;
        if (u >= 1) { s.m.visible = false; continue; }
        s.m.position.addScaledVector(s.v, o.dt);
        X.copy(s.v).normalize(); Z.subVectors(o.cam.position, s.m.position); Z.addScaledVector(X, -Z.dot(X)).normalize(); Y.crossVectors(Z, X);
        B.makeBasis(X, Y, Z); s.m.quaternion.setFromRotationMatrix(B);
        s.m.scale.set(s.len * Math.min(1, u * 4), s.big ? 1 : .6, 1);
        s.m.material.opacity = Math.sin(Math.PI * u) * (s.big ? 1 : .85);
      }
    },
    meteorNow: () => launch(false),
    active: () => pool.filter(p => p.m.visible).length,
  };
}
