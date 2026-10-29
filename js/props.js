// Mesh builders for everything on the island. Every builder returns a Group whose origin is on the ground.
// Materials that should whiten under snow are registered in SNOWY (main.js tints them every frame).
import * as THREE from 'three';

export const M = (c, r = .7) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
export const cyl = (a, b, h, s = 12) => new THREE.CylinderGeometry(a, b, h, s);
export const sph = (r, w = 16, h = 12) => new THREE.SphereGeometry(r, w, h);
export const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
export function mk(geo, mat, pos = [0, 0, 0], parent, shadow = true) {
  const o = new THREE.Mesh(geo, mat);
  o.position.set(...pos); o.castShadow = o.receiveShadow = shadow;
  parent && parent.add(o); return o;
}

export const SNOWY = [];
export const snowy = (m, k) => { m.userData.base = m.color.clone(); m.userData.k = k; SNOWY.push(m); return m; };
export const MATS = {
  leaf: [snowy(M(0xffffff), .55), snowy(M(0xffffff), .55), snowy(M(0xffffff), .55)],
  pine: [snowy(M(0xffffff), .75), snowy(M(0xffffff), .75)],
  trunk: M(0x8a6444),
  rock: [snowy(M(0x9aa0a6, .95), .45), snowy(M(0x868c93, .95), .45)],
  wood: snowy(M(0xb8864f, .8), .25), wood2: snowy(M(0x8f6740, .85), .25),
  roof: snowy(M(0xc4553f, .8), .9), roof2: snowy(M(0x7d5a3c, .85), .9),
  stone: snowy(M(0xcfc6b4, .95), .85),
  wall: M(0xf3e8d2, .9),
  lamp: new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffd27a, emissiveIntensity: 0 }),
  metal: M(0x4a5560, .5),
  flame: [new THREE.MeshBasicMaterial({ color: 0xffb02e }), new THREE.MeshBasicMaterial({ color: 0xff6a1a }), new THREE.MeshBasicMaterial({ color: 0xffe98a })],
  flower: [0xffffff, 0xffd36e, 0xc7a8ff, 0xff7a6b, 0xffa6c9].map(c => M(c, .9)),
  stem: M(0x4f9a4a),
  cap: [0xe0525a, 0xf08a3c, 0xb98ae0].map(c => M(c, .7)),
  puddle: new THREE.MeshStandardMaterial({ color: 0x9ab8cc, roughness: .05, metalness: .2, transparent: true, opacity: 0, depthWrite: false }),
  ripple: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
  berry: M(0xd9405a, .6),
};

const sway = (g, amp = 1) => { g.userData.sway = { amp, ph: Math.random() * 6.28 }; return g; };

export function tree(v, s = 1, m = 0) {
  const g = new THREE.Group();
  if (v === 'pine') {
    mk(cyl(.12 * s, .18 * s, 1 * s), MATS.trunk, [0, .5 * s, 0], g);
    const P = MATS.pine[m % 2];
    [[1.05, 1.15, 1.25], [.82, 1, 1.95], [.56, .9, 2.55]].forEach(([r, h, y]) => mk(new THREE.ConeGeometry(r * s, h * s, 10), P, [0, y * s, 0], g));
  } else {
    mk(cyl(.15 * s, .22 * s, 1.2 * s, 10), MATS.trunk, [0, .6 * s, 0], g);
    mk(sph(1.1 * s, 20, 14), MATS.leaf[m], [0, 1.9 * s, 0], g);
    mk(sph(.7 * s), MATS.leaf[m], [.6 * s, 1.5 * s, .3 * s], g);
  }
  return sway(g, 1);
}
export function bush(s = 1, m = 0, berry) {
  const g = new THREE.Group();
  [[0, .32, 0, .45], [.38, .26, .1, .33], [-.3, .24, -.12, .3]].forEach(([x, y, z, r]) => mk(sph(r * s, 12, 10), MATS.leaf[m], [x * s, y * s, z * s], g));
  if (berry) for (let i = 0; i < 5; i++) mk(sph(.05 * s, 6, 6), MATS.berry, [Math.cos(i * 1.3) * .36 * s, (.3 + (i % 2) * .15) * s, Math.sin(i * 1.3) * .36 * s], g, false);
  return sway(g, .5);
}
export function rock(s = 1, m = 0) {
  const g = new THREE.Group(), r = mk(new THREE.DodecahedronGeometry(1, 0), MATS.rock[m], [0, s * .32, 0], g);
  r.scale.set(s, s * .72, s * .88); r.rotation.set(Math.random(), Math.random() * 6, Math.random() * .4);
  return g;
}
export function flower(c = 0) {
  const g = new THREE.Group();
  mk(cyl(.014, .018, .26, 5), MATS.stem, [0, .13, 0], g, false);
  const head = new THREE.Group(); head.position.y = .27; g.add(head);
  mk(sph(.095, 10, 8), MATS.flower[c % 5], [0, 0, 0], head, false).scale.y = .7;
  mk(sph(.045, 8, 6), MATS.flower[1], [0, .05, 0], head, false);
  g.userData.head = head; return sway(g, 3);
}
export function mushroom(c = 0, s = 1) {
  const g = new THREE.Group();
  mk(cyl(.035 * s, .05 * s, .14 * s, 8), MATS.wall, [0, .07 * s, 0], g, false);
  mk(new THREE.SphereGeometry(.12 * s, 12, 8, 0, 6.283, 0, Math.PI / 2), MATS.cap[c % 3], [0, .13 * s, 0], g, false);
  return g;
}
export function crate() { const g = new THREE.Group(); mk(box(.55, .55, .55), MATS.wood2, [0, .275, 0], g); mk(box(.58, .08, .58), MATS.wood, [0, .5, 0], g); return g; }
export function barrel() { const g = new THREE.Group(); mk(cyl(.26, .3, .62, 12), MATS.wood2, [0, .31, 0], g); [.15, .47].forEach(y => mk(cyl(.31, .31, .04, 12), MATS.metal, [0, y, 0], g, false)); return g; }
export function lamp() {
  const g = new THREE.Group();
  mk(cyl(.05, .07, 1.7, 8), MATS.metal, [0, .85, 0], g);
  mk(sph(.17, 12, 10), MATS.lamp, [0, 1.8, 0], g, false);
  mk(new THREE.ConeGeometry(.24, .2, 8), MATS.metal, [0, 2.02, 0], g);
  return g;
}
export function bench() {
  const g = new THREE.Group();
  mk(box(1.4, .08, .45), MATS.wood, [0, .45, 0], g); mk(box(1.4, .4, .06), MATS.wood, [0, .72, -.2], g).rotation.x = -.12;
  [-.6, .6].forEach(x => mk(box(.08, .45, .4), MATS.wood2, [x, .22, 0], g));
  return g;
}
export function fencePost() {
  const g = new THREE.Group();
  mk(box(.14, .85, .14), MATS.wood2, [0, .42, 0], g);
  return g;
}
export function fenceRail(len) { const r = mk(box(len, .08, .06), MATS.wood, [0, .6, 0]); r.castShadow = true; return r; }
export function campfire() {
  const g = new THREE.Group();
  for (let i = 0; i < 8; i++) mk(sph(.1, 8, 6), MATS.rock[i % 2], [Math.cos(i * .785) * .36, .06, Math.sin(i * .785) * .36], g);
  for (const a of [.6, -.6]) { const l = mk(cyl(.055, .06, .75, 6), MATS.trunk, [0, .1, 0], g); l.rotation.set(Math.PI / 2, 0, a); }
  const fl = [[.17, .5, 0], [.12, .38, 1], [.1, .3, 2]].map(([r, h, m], i) => mk(new THREE.ConeGeometry(r, h, 7), MATS.flame[m], [(i - 1) * .06, .28 + h / 2 * .4, 0], g, false));
  g.userData.flames = fl; return g;
}
export function windmill() {
  const g = new THREE.Group();
  mk(cyl(.55, .9, 3.4, 12), MATS.wall, [0, 1.7, 0], g);
  mk(new THREE.ConeGeometry(.82, 1, 12), MATS.roof, [0, 3.9, 0], g);
  mk(box(.36, .7, .1), MATS.wood2, [0, .35, .88], g);
  const hub = new THREE.Group(); hub.position.set(0, 3.1, .78); g.add(hub);
  mk(sph(.14, 10, 8), MATS.metal, [0, 0, .04], hub, false);
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group(); arm.rotation.z = i * Math.PI / 2; hub.add(arm);
    mk(box(.07, 2.15, .05), MATS.wood2, [0, 1.07, 0], arm);
    mk(box(.52, 1.35, .03), MATS.stone, [.28, 1.35, .02], arm, false);
  }
  g.userData.hub = hub; return g;
}
export function gazebo() {
  const g = new THREE.Group();
  mk(cyl(2.15, 2.2, .16, 24), MATS.wood, [0, .08, 0], g);
  for (let i = 0; i < 6; i++) mk(cyl(.09, .09, 2.4, 8), MATS.wood2, [Math.cos(i * 1.047) * 1.85, 1.36, Math.sin(i * 1.047) * 1.85], g);
  const roof = mk(new THREE.ConeGeometry(2.85, 1.25, 6), MATS.roof, [0, 3.15, 0], g); roof.rotation.y = 0;
  mk(sph(.13, 8, 8), MATS.metal, [0, 3.85, 0], g);
  mk(box(1.5, .08, .42), MATS.wood, [0, .5, -1.25], g); mk(box(1.5, .34, .06), MATS.wood, [0, .75, -1.46], g);
  mk(cyl(.015, .015, .5, 4), MATS.metal, [0, 2.3, 0], g, false); mk(sph(.14, 10, 8), MATS.lamp, [0, 1.95, 0], g, false);
  return g;
}
export function leanto() {
  const g = new THREE.Group();
  mk(box(3.3, .1, 2.5), MATS.stone, [0, .05, 0], g);
  mk(box(3.3, 2.3, .16), MATS.wood2, [0, 1.15, -1.1], g);
  mk(box(.14, 2.0, 1.9), MATS.wood2, [-1.6, 1.0, -.2], g);
  mk(box(.14, 2.0, 1.9), MATS.wood2, [1.6, 1.0, -.2], g);
  const roof = mk(box(3.9, .12, 3.1), MATS.roof2, [0, 2.28, .1], g); roof.rotation.x = .2;
  [-1.6, 1.6].forEach(x => mk(cyl(.07, .07, 2.0, 8), MATS.wood, [x, 1.0, 1.0], g));
  mk(sph(.13, 10, 8), MATS.lamp, [-1.1, 1.85, -.9], g, false);
  mk(box(.9, .14, .3), MATS.wood, [.3, .22, -.55], g);
  return g;
}
// The signboard: two posts, a wooden board with the painted face texture, a little gabled roof (whitens under snow)
// and a lantern at each end that glows with the other lamps and swings in the wind. Faces +z; origin on the ground.
export function signboard(map) {
  const g = new THREE.Group();
  mk(box(5.9, .16, .95), MATS.stone, [0, .08, 0], g);
  for (const s of [-1, 1]) mk(cyl(.12, .14, 4.05, 10), MATS.wood2, [s * 2.62, 2.02, 0], g);
  mk(box(5.1, 3.0, .18), MATS.wood, [0, 2.22, 0], g);
  mk(box(5.4, .16, .3), MATS.wood2, [0, 3.76, .02], g); mk(box(5.4, .16, .3), MATS.wood2, [0, .7, .02], g);
  const face = new THREE.MeshStandardMaterial({ map, roughness: .85, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: .1 });
  const f = mk(new THREE.PlaneGeometry(4.9, 2.8), face, [0, 2.22, .095], g, false);
  for (const s of [1, -1]) { const r = mk(box(6.1, .1, 1.15), MATS.roof, [0, 4.14, s * .5], g); r.rotation.x = s * .5; }
  mk(box(6.1, .1, .16), MATS.roof2, [0, 4.4, 0], g);
  const lanterns = [-1, 1].map(s => {
    mk(box(.08, .08, .8), MATS.metal, [s * 2.62, 3.55, .45], g);
    const pv = new THREE.Group(); pv.position.set(s * 2.62, 3.55, .82); g.add(pv);
    mk(cyl(.012, .012, .3, 4), MATS.metal, [0, -.15, 0], pv, false);
    mk(new THREE.ConeGeometry(.17, .14, 8), MATS.metal, [0, -.3, 0], pv, false);
    mk(sph(.14, 12, 10), MATS.lamp, [0, -.44, 0], pv, false);
    return pv;
  });
  g.userData.lanterns = lanterns; g.userData.face = face; g.userData.faceMesh = f;
  return g;
}
export function puddle(s) {
  const g = new THREE.Group();
  const p = mk(new THREE.CircleGeometry(1, 20), MATS.puddle, [0, .02, 0], g, false); p.rotation.x = -Math.PI / 2; p.scale.set(s, s * .8, 1);
  const r = mk(new THREE.RingGeometry(.82, 1, 24), MATS.ripple.clone(), [0, .03, 0], g, false); r.rotation.x = -Math.PI / 2; r.scale.setScalar(.01);
  g.userData.ripple = r; g.userData.s = s; return g;
}
export function lilypad(s = .3) {
  const m = mk(new THREE.CircleGeometry(s, 12, .5, 5.6), M(0x4f9a4a, .8), [0, .07, 0], null, false); m.rotation.x = -Math.PI / 2; return m;
}
