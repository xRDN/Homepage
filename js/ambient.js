// Small, rare moments that make the island feel alive (and are worth a screenshot):
//   a hot-air balloon drifting past on calm days · a paper boat on the pond after rain · birds landing on the board roof.
// (The firefly heart lives in main.js, because it borrows the firefly particles.)
import * as THREE from 'three';
import { M, sph, cyl, mk } from './props.js';

const rand = (a, b) => a + Math.random() * (b - a);
const ease = u => u * u * (3 - 2 * u);

function stripes() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
  const cols = ['#e8554e', '#f6d06a', '#fbf6ea', '#5aa0d8', '#e8554e', '#f6d06a', '#fbf6ea', '#5aa0d8'];
  cols.forEach((col, i) => { g.fillStyle = col; g.fillRect(i * 32, 0, 32, 64); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function createAmbient({ scene, POND, roof }) {
  // ---- hot-air balloon ----
  const balloon = new THREE.Group();
  const env = mk(sph(2.1, 24, 18), new THREE.MeshStandardMaterial({ map: stripes(), roughness: .7 }), [0, 3.2, 0], balloon, false); env.scale.set(1, 1.18, 1);
  mk(new THREE.ConeGeometry(1.05, 1.3, 16, 1, true), M(0xd9474f, .7), [0, 1.05, 0], balloon, false).rotation.x = Math.PI;
  mk(new THREE.BoxGeometry(.7, .55, .7), M(0x9a6b3d, .9), [0, -.35, 0], balloon, false);
  for (const [x, z] of [[-.3, -.3], [.3, -.3], [-.3, .3], [.3, .3]]) mk(cyl(.015, .015, 1.3, 4), M(0x5a4030, .9), [x, .35, z], balloon, false);
  balloon.visible = false; scene.add(balloon);
  let bal = null;

  // ---- paper boat ----
  const boat = new THREE.Group(), paper = new THREE.MeshStandardMaterial({ color: 0xfbfaf4, roughness: .9, side: THREE.DoubleSide, transparent: true });
  const hull = mk(new THREE.CylinderGeometry(.22, .12, .1, 4, 1), paper, [0, .05, 0], boat, false); hull.scale.set(1, 1, .45); hull.rotation.y = Math.PI / 4;
  mk(new THREE.ConeGeometry(.14, .26, 4), paper, [0, .2, 0], boat, false).scale.set(1, 1, .25);
  boat.visible = false; scene.add(boat);
  let bt = null;

  // ---- birds ----
  const birdMat = M(0x4a5a7a, .7), belly = M(0xe8d9c0, .8), beakM = M(0xf2a23a, .5);
  const birds = [0, 1, 2].map(i => {
    const g = new THREE.Group();
    mk(sph(.09, 10, 8), i === 1 ? M(0x8a5a3a, .7) : birdMat, [0, .09, 0], g, false).scale.set(.9, .85, 1.3);
    mk(sph(.06, 8, 6), belly, [0, .07, .04], g, false);
    mk(sph(.06, 10, 8), i === 1 ? M(0x8a5a3a, .7) : birdMat, [0, .19, .08], g, false);
    mk(new THREE.ConeGeometry(.022, .07, 5), beakM, [0, .19, .155], g, false).rotation.x = Math.PI / 2;
    const wings = [-1, 1].map(s => { const w = new THREE.Group(); w.position.set(s * .07, .12, 0); g.add(w); mk(new THREE.BoxGeometry(.16, .015, .1), i === 1 ? M(0x8a5a3a, .7) : birdMat, [s * .08, 0, 0], w, false); return w; });
    g.visible = false; scene.add(g);
    return { g, wings, phase: 'off', t: 0, from: new THREE.Vector3(), to: new THREE.Vector3(), hop: 0 };
  });
  let birdsOut = false;
  const perch = (i) => new THREE.Vector3(roof.x + [-1.7, -.3, 1.2][i] + rand(-.2, .2), roof.y, roof.z + rand(-.05, .05));

  return {
    // conditions: { day, calm, clear, horror, wind, me, play }
    tryBalloon(c) { if (bal || !c.day || c.wind > .5 || !c.clear || c.horror) return false; const a = rand(0, 6.28), r = 34; bal = { t: 0, life: rand(70, 95), a, r, y: rand(14, 20) }; balloon.visible = true; return true; },
    boat(c) { if (bt || c.ice) return false; bt = { t: 0, life: 70, a: rand(0, 6.28), r: POND.r * .55 }; boat.visible = true; paper.opacity = 1; return true; },
    tryBirds(c) {
      if (birdsOut || !c.day || !c.clear || c.wind > .6 || c.horror) return false;
      if (c.me && Math.hypot(c.me.x - roof.x, c.me.z - roof.z) < 5) return false;
      birdsOut = true;
      birds.forEach((b, i) => { b.phase = 'in'; b.t = -i * .5; const a = rand(0, 6.28); b.from.set(roof.x + Math.cos(a) * 30, rand(12, 18), roof.z + Math.sin(a) * 30); b.to.copy(perch(i)); b.g.visible = true; });
      return true;
    },
    get busy() { return { balloon: !!bal, boat: !!bt, birds: birdsOut }; },
    tick(dt, t, c) {
      if (bal) { // drifts across the sky along a chord, gently bobbing and turning
        bal.t += dt; const u = bal.t / bal.life;
        const sx = Math.cos(bal.a) * bal.r, sz = Math.sin(bal.a) * bal.r;
        balloon.position.set(sx + (-2 * sx) * u + Math.sin(bal.a) * 8 * Math.sin(Math.PI * u), bal.y + Math.sin(t * .5) * .4, sz + (-2 * sz) * u - Math.cos(bal.a) * 8 * Math.sin(Math.PI * u));
        balloon.rotation.y = t * .05;
        if (u >= 1 || c.horror) { bal = null; balloon.visible = false; }
      }
      if (bt) { // a slow loop round the pond; sinks (fades) when it is done or the pond freezes
        bt.t += dt; const u = bt.t / bt.life;
        bt.a += dt * .12; boat.position.set(POND.x + Math.cos(bt.a) * bt.r, .06 + Math.sin(t * 2) * .012, POND.z + Math.sin(bt.a) * bt.r);
        boat.rotation.set(Math.sin(t * 1.7) * .08, -bt.a, Math.cos(t * 1.3) * .06);
        if (u > .85 || c.ice) paper.opacity = Math.max(0, paper.opacity - dt * .3);
        if (u >= 1 || paper.opacity <= 0) { bt = null; boat.visible = false; }
      }
      if (birdsOut) {
        const near = c.me && Math.hypot(c.me.x - roof.x, c.me.z - roof.z) < 3.4;
        let gone = 0;
        for (const [i, b] of birds.entries()) {
          b.t += dt;
          const flap = Math.sin(t * 28 + i) * .9;
          if (b.phase === 'in') {
            if (b.t < 0) { b.g.visible = false; continue; } b.g.visible = true;
            const u = Math.min(1, b.t / 3.2), e = ease(u);
            b.g.position.lerpVectors(b.from, b.to, e); b.g.position.y += Math.sin(Math.PI * u) * 2.5;
            b.g.rotation.y = Math.atan2(b.to.x - b.from.x, b.to.z - b.from.z);
            b.wings.forEach((w, s) => w.rotation.z = (s ? -1 : 1) * flap);
            if (u >= 1) { b.phase = 'sit'; b.t = 0; b.stay = rand(30, 55); }
          } else if (b.phase === 'sit') { // little hops and head turns
            b.wings.forEach((w, s) => w.rotation.z = (s ? -1 : 1) * .15);
            if ((b.hop -= dt) <= 0) { b.hop = rand(1.5, 4); b.g.rotation.y = rand(-1.5, 1.5); b.g.position.x = Math.min(roof.x + 2.6, Math.max(roof.x - 2.6, b.g.position.x + rand(-.25, .25))); }
            b.g.position.y = roof.y + Math.max(0, Math.sin(b.t * 9) * .05) * (b.hop > 1.3 ? 0 : 1);
            if (near || b.t > b.stay || c.horror || c.rain) { b.phase = 'out'; b.t = 0; b.from.copy(b.g.position); const a = rand(0, 6.28); b.to.set(roof.x + Math.cos(a) * 35, rand(15, 22), roof.z + Math.sin(a) * 35); }
          } else if (b.phase === 'out') {
            const u = Math.min(1, b.t / 2.6);
            b.g.position.lerpVectors(b.from, b.to, u * u); b.g.rotation.y = Math.atan2(b.to.x - b.from.x, b.to.z - b.from.z);
            b.wings.forEach((w, s) => w.rotation.z = (s ? -1 : 1) * flap);
            if (u >= 1) { b.phase = 'off'; b.g.visible = false; }
          } else gone++;
        }
        if (gone === birds.length) birdsOut = false;
      }
    },
  };
}
