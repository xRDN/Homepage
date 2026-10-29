// Island layout engine. Pure maths, no THREE: deterministic for a given seed, so it can be cached and tested in Node.
//   - best-candidate placement (Mitchell): sample k spots, keep the one with the most free space
//   - pattern placement: arcs, rings, rows, clusters, runs along a path
// Everything is checked against one occupancy board, so nothing overlaps and the walkways stay open.
export const R_ISLAND = 13;
const TAU = Math.PI * 2;

export const mulberry32 = a => () => {
  a = a + 0x6D2B79F5 | 0;
  let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};

const segDist = (px, pz, ax, az, bx, bz) => {
  const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz;
  const t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l)) : 0;
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
};

class Board {
  constructor() { this.discs = []; this.lanes = []; }
  add(x, z, r, kind) { this.discs.push({ x, z, r, kind }); }
  lane(pts, w) { this.lanes.push({ pts, w }); }
  // free space around a point: distance to the nearest thing minus its size (negative = overlapping)
  clear(x, z, ignore) {
    let c = R_ISLAND - .5 - Math.hypot(x, z);
    for (const d of this.discs) if (!ignore || !ignore.has(d.kind)) c = Math.min(c, Math.hypot(x - d.x, z - d.z) - d.r);
    if (!ignore || !ignore.has('lane')) for (const l of this.lanes) for (let i = 1; i < l.pts.length; i++) c = Math.min(c, segDist(x, z, ...l.pts[i - 1], ...l.pts[i]) - l.w);
    return c;
  }
}

export function createLayout({ seed = 1, links = 3, projects = 3 } = {}) {
  const rnd = mulberry32(seed), B = new Board();
  const R = (a, b) => a + rnd() * (b - a), pick = a => a[Math.floor(rnd() * a.length)];
  const polar = (r, a, cx = 0, cz = 0) => [cx + Math.cos(a) * r, cz + Math.sin(a) * r];
  const inDisc = (cx, cz, r) => () => polar(r * Math.sqrt(rnd()), R(0, TAU), cx, cz);
  const inRing = (r0, r1) => () => polar(R(r0, r1), R(0, TAU));
  const out = { seed, props: [], stations: [], shelters: [], stones: [], lamps: [], acorns: [], lanes: [], puddles: [] };

  // Mitchell's best candidate: k samples, keep the one with the most free space (capped, so it doesn't always pick the biggest hole)
  function best({ gen, r = .3, margin = .25, k = 22, score, cap = 5, noise = .4, ignore }) {
    let top = null, ts = -1e9;
    for (let i = 0; i < k; i++) {
      const [x, z] = gen(), c = B.clear(x, z, ignore);
      if (c < r + margin) continue;
      const s = Math.min(c, cap) + (score ? score(x, z, c) : 0) + rnd() * noise;
      if (s > ts) { ts = s; top = { x, z }; }
    }
    return top;
  }
  const put = (kind, p, r, extra = {}) => {
    if (!p) return null;
    const o = { k: kind, x: p.x, z: p.z, rot: R(0, TAU), s: 1, r: 0, ...extra };
    out.props.push(o); B.add(o.x, o.z, extra.foot ?? Math.max(o.r * (kind === 'tree' || kind === 'bush' ? o.s : 1), .25), kind); return o;
  };

  // ---- 1. keep the spawn plaza open
  B.add(0, 0, 2, 'spawn');

  // ---- 2. stations on arcs behind the plaza (north = -z). Capacity per ring comes from spacing, extra items spill outward.
  const NORTH = -Math.PI / 2;
  function arcSlots(n, r0, gap, maxSpan, da = 0) {
    const pts = [], step = gap / r0, per = Math.max(1, Math.floor(maxSpan / step) + 1);
    for (let i = 0, ring = 0; i < n; ring++) {
      const m = Math.min(per, n - i), r = r0 + ring * gap;
      for (let j = 0; j < m; j++, i++) pts.push({ r, a: NORTH + da + (j - (m - 1) / 2) * (gap / r), ring });
    }
    return pts;
  }
  const gapP = projects <= 4 ? 3.8 : 3.4, gapL = links <= 4 ? 5 : 4.4; // roomy while there is space, tight when the island fills up
  const projSlots = arcSlots(projects, 6.2, gapP, 1.9);
  const linkR = Math.min(11, Math.max(10.2, Math.max(0, ...projSlots.map(s => s.r)) + 4));
  // The camera looks north, so a far sign directly behind a near one hides it. Shift the link arc sideways to the offset
  // where every link sits furthest (sideways) from every project, but still inside the island and near the centre line.
  const sideX = s => Math.cos(s.a) * s.r, projX = projSlots.map(sideX);
  let linkSlots = arcSlots(links, linkR, gapL, 2.1), linkScore = -1e9;
  for (let i = -12; i <= 12; i++) {
    const cand = arcSlots(links, linkR, gapL, 2.1, i * .03);
    if (cand.some(s => Math.hypot(s.r * Math.cos(s.a), s.r * Math.sin(s.a)) > 11.2)) continue;
    const gapX = Math.min(...cand.flatMap(c => projX.map(px => Math.abs(sideX(c) - px))), 9);
    const sc = Math.min(gapX, 2.6) * 3 - Math.abs(i) * .05;
    if (sc > linkScore) { linkScore = sc; linkSlots = cand; }
  }
  const place = (slot, kind, idx) => {
    let [x, z] = polar(slot.r, slot.a);
    if (Math.hypot(x, z) > 11.4) { const q = best({ gen: inRing(4, 11.2), r: 1.5, margin: .4, k: 60 }); if (q) { x = q.x; z = q.z; } }
    out.stations.push({ kind, idx, x, z, a: slot.a }); B.add(x, z, 1.9, 'station');
  };
  linkSlots.forEach((s, i) => place(s, 'link', i));
  projSlots.forEach((s, i) => place(s, 'proj', i));

  // ---- 3. pond: score every grid spot (room to breathe, ~8.5 from centre, a little left of the camera's view)
  const PR = 2.6; let pond = null, ps = -1e9;
  for (let x = -11; x <= 11; x += .5) for (let z = -2; z <= 11; z += .5) {
    const c = B.clear(x, z) - PR;
    if (c < 1.8) continue;
    const s = Math.min(c, 4) - Math.abs(Math.hypot(x, z) - 8.4) * .45 + (x < 0 ? .8 : 0) + rnd() * 1.6;
    if (s > ps) { ps = s; pond = { x, z, r: PR }; }
  }
  pond = pond || { x: -7, z: 5, r: PR };
  out.pond = pond; B.add(pond.x, pond.z, PR + .2, 'pond');
  const pondA = Math.atan2(pond.z, pond.x);

  // ---- 4. shelters: gazebo opposite the pond, lean-to on the pond shore facing the water
  const gz = best({
    gen: inRing(4.5, 9), r: 2.7, margin: .5, k: 140,
    score: (x, z) => -Math.abs(Math.hypot(x, z) - 6.3) * .7 - Math.max(0, Math.cos(Math.atan2(z, x) - pondA)) * 3,
  });
  if (gz) { out.shelters.push({ k: 'gazebo', x: gz.x, z: gz.z, rot: R(0, TAU), r: 2.3, roofY: 2.5 }); B.add(gz.x, gz.z, 2.9, 'shelter'); }
  let lt = null, ls = -1e9;
  for (let i = 0; i < 36; i++) {
    const a = i / 36 * TAU, [x, z] = polar(pond.r + 2.6, a, pond.x, pond.z), c = B.clear(x, z, new Set(['pond']));
    if (c < 2.2 + .3 || Math.hypot(x, z) > 11) continue;
    const s = Math.min(c, 3) - Math.hypot(x, z) * .12 + rnd() * .5;
    if (s > ls) { ls = s; lt = { x, z, a }; }
  }
  if (lt) {
    const rot = Math.atan2(pond.x - lt.x, pond.z - lt.z); // local +z points at the water
    out.shelters.push({ k: 'leanto', x: lt.x, z: lt.z, rot, r: 1.75, roofY: 2.2 });
    B.add(lt.x, lt.z, 2.4, 'shelter');
  }
  const sh = out.shelters;

  // ---- 5. walkways: plaza ring + spokes to the pond and gazebo + an arc inside the project row
  const trim = ([ax, az], [bx, bz], by) => { const d = Math.hypot(bx - ax, bz - az) || 1, k = Math.max(0, d - by) / d; return [ax + (bx - ax) * k, az + (bz - az) * k]; };
  const runs = [];
  runs.push([[0, 0], trim([0, 0], [pond.x, pond.z], pond.r + .9)]);
  if (gz) runs.push([[0, 0], trim([0, 0], [gz.x, gz.z], 3.2)]);
  if (projSlots.length) {
    const r = projSlots[0].r - 1.9, spans = projSlots.filter(s => s.ring === 0), arc = [];
    const a0 = spans[0].a - .12, a1 = spans[spans.length - 1].a + .12;
    for (let i = 0; i <= 6; i++) arc.push(polar(r, a0 + (a1 - a0) * i / 6));
    runs.push(arc, [[0, 0], polar(r, NORTH)]);
  }
  for (const pts of runs) { B.lane(pts, .85); out.lanes.push(pts); }
  const solid = p => B.discs.some(d => d.kind !== 'spawn' && Math.hypot(p[0] - d.x, p[1] - d.z) < d.r + .1);
  const stone = (x, z) => { if (!solid([x, z])) out.stones.push({ x, z, s: R(.75, 1.05), rot: R(0, TAU) }); };
  for (let i = 0; i < 14; i++) { const [x, z] = polar(2.5, i / 14 * TAU + .1); stone(x, z); } // plaza ring
  for (const pts of runs) for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i], len = Math.hypot(bx - ax, bz - az), n = Math.floor(len / .95);
    for (let j = 0; j <= n; j++) { const t = j / Math.max(n, 1), nx = -(bz - az) / (len || 1), nz = (bx - ax) / (len || 1), o = R(-.22, .22); stone(ax + (bx - ax) * t + nx * o, az + (bz - az) * t + nz * o); }
  }

  // ---- 6. pattern props (placed biggest / most important first)
  const loc = (s, lx, lz) => { const c = Math.cos(s.rot), n = Math.sin(s.rot); return { x: s.x + lx * c + lz * n, z: s.z - lx * n + lz * c }; };
  const lean = sh.find(s => s.k === 'leanto');
  if (lean) {
    put('campfire', loc(lean, .1, .45), 0, { r: .45, foot: .3 });
    put('crate', loc(lean, -1.1, -.55), 0, { rot: lean.rot + R(-.3, .3), r: .3, foot: .2 });
    put('barrel', loc(lean, -1.15, .3), 0, { r: .3, foot: .2 });
  }

  // lamps: a ring around the plaza, then alternate sides along the spokes (max 9)
  let lampN = 0;
  const l0 = R(0, TAU);
  for (let i = 0; i < 4; i++) {
    const [x, z] = polar(3.9, l0 + i / 4 * TAU);
    if (B.clear(x, z, new Set(['spawn', 'lane'])) > .5) { put('lamp', { x, z }, 0, { r: .16, foot: .3 }); lampN++; }
  }
  for (const pts of runs.slice(0, 3)) for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i], len = Math.hypot(bx - ax, bz - az) || 1;
    for (let d = 2.4; d < len && lampN < 9; d += 4.6) {
      const side = lampN % 2 ? 1 : -1, x = ax + (bx - ax) * d / len - (bz - az) / len * 1.25 * side, z = az + (bz - az) * d / len + (bx - ax) / len * 1.25 * side;
      if (B.clear(x, z, new Set(['spawn', 'lane'])) > .5) { put('lamp', { x, z }, 0, { r: .16, foot: .3 }); lampN++; }
    }
  }

  // bench on the shore between pond and plaza, facing the water
  const bp = { x: pond.x - Math.cos(pondA) * (pond.r + 1.15), z: pond.z - Math.sin(pondA) * (pond.r + 1.15) };
  let bn = null;
  for (const da of [0, .5, -.5, 1, -1]) {
    const a = pondA + Math.PI + da, p = { x: pond.x + Math.cos(a) * (pond.r + 1.15), z: pond.z + Math.sin(a) * (pond.r + 1.15) };
    if (B.clear(p.x, p.z, new Set(['pond'])) > .9) { bn = p; break; }
  }
  if (bn) put('bench', bn, 0, { rot: Math.atan2(pond.x - bn.x, pond.z - bn.z), r: .55, foot: .8 });

  // windmill: far from the plaza and stations, near the rim
  put('windmill', best({ gen: inRing(8.6, 10.6), r: 1.6, margin: .5, k: 120, score: (x, z) => Math.hypot(x, z) * .2 }), 0, { r: 1.05, foot: 1.7, rot: 0 });
  const wm = out.props.find(p => p.k === 'windmill'); if (wm) wm.rot = Math.atan2(-wm.x, -wm.z); // face the plaza

  // fence runs on the rim beside the pond and the gazebo
  for (const a of [pondA, gz ? Math.atan2(gz.z, gz.x) : pondA + Math.PI]) {
    for (let i = -2; i <= 2; i++) {
      const aa = a + i * (1.55 / 12.4), [x, z] = polar(12.3, aa);
      if (B.clear(x, z) > -.3 && B.discs.every(d => d.kind === 'spawn' || Math.hypot(x - d.x, z - d.z) > d.r + .1)) put('fence', { x, z }, 0, { rot: aa, r: .16, foot: .35, i });
    }
  }

  // trees: a ring along the rim (pattern) + two groves (cluster pattern)
  const rim0 = R(0, TAU), RIM = 13;
  for (let i = 0; i < RIM; i++) {
    const a = rim0 + i / RIM * TAU + R(-.12, .12);
    const p = best({ gen: () => polar(R(10.2, 11.5), a + R(-.15, .15)), r: .6, margin: .25, k: 10, noise: .3 });
    put('tree', p, 0, { v: rnd() < .5 ? 'pine' : 'round', s: R(.95, 1.35), m: Math.floor(R(0, 3)), r: .6 });
  }
  for (let g = 0; g < 2; g++) {
    const c = best({ gen: inRing(4.5, 9.5), r: 3, margin: 0, k: 80, score: (x, z) => -Math.abs(Math.hypot(x, z) - 7.5) * .3 });
    if (!c) continue;
    for (let i = 0; i < 5; i++) put('tree', best({ gen: inDisc(c.x, c.z, 2.4), r: .8, margin: .3, k: 14 }), 0, { v: g ? 'pine' : (rnd() < .3 ? 'pine' : 'round'), s: R(.85, 1.2), m: Math.floor(R(0, 3)), r: .6 });
  }
  const trees = out.props.filter(p => p.k === 'tree');

  // rocks: three clusters
  for (let g = 0; g < 3; g++) {
    const c = best({ gen: inRing(4, 11), r: 1.6, margin: .2, k: 60 });
    if (!c) continue;
    const n = 2 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) { const s = R(.35, .85); put('rock', best({ gen: inDisc(c.x, c.z, 1.3), r: s * .8, margin: .1, k: 12 }), 0, { s, m: i % 2, r: s * .85, foot: s * .9 }); }
  }
  // bushes hug trees
  for (let i = 0; i < 9; i++) {
    put('bush', best({ gen: inRing(3.5, 11.5), r: .55, margin: .15, k: 26, score: (x, z) => { let d = 1e9; for (const t of trees) d = Math.min(d, Math.hypot(x - t.x, z - t.z)); return -Math.min(d, 6) * .5; } }), 0, { s: R(.7, 1.1), v: rnd() < .4 ? 'berry' : 'plain', m: Math.floor(R(0, 3)), r: .5 });
  }
  // fairy ring of mushrooms in a clearing + pairs at tree roots
  const fc = best({ gen: inRing(3.5, 10), r: 1.5, margin: .3, k: 60 });
  if (fc) for (let i = 0; i < 7; i++) { const [x, z] = polar(.95, i / 7 * TAU, fc.x, fc.z); put('mushroom', { x, z }, 0, { s: R(.8, 1.2), c: i % 3, foot: .15 }); }
  for (const t of trees.slice(0, 5)) for (let i = 0; i < 2; i++) { const [x, z] = polar(t.s * .9 + .3, R(0, TAU), t.x, t.z); if (B.clear(x, z) > .15) put('mushroom', { x, z }, 0, { s: R(.7, 1), c: Math.floor(R(0, 3)), foot: .15 }); }

  // flowers: a ring around the pond, themed patches, and a sparse far scatter
  const FC = [0xffffff, 0xffd36e, 0xc7a8ff, 0xff7a6b, 0xffa6c9];
  for (let i = 0; i < 16; i++) {
    const a = pondA + i / 16 * TAU + R(-.1, .1), rr = pond.r + R(.7, 1.3), [x, z] = polar(rr, a, pond.x, pond.z);
    if (B.clear(x, z, new Set(['pond'])) > .35) put('flower', { x, z }, 0, { c: i % 2 ? 4 : 0, foot: .12 });
  }
  for (let g = 0; g < 5; g++) {
    const c = best({ gen: inRing(2.8, 11), r: 1.4, margin: 0, k: 50 }), col = FC[g % 5];
    if (!c) continue;
    for (let i = 0; i < 8; i++) { const p = best({ gen: inDisc(c.x, c.z, 1.35), r: .15, margin: .05, k: 8, cap: 1 }); put('flower', p, 0, { c: FC.indexOf(col), foot: .12 }); }
  }
  for (let i = 0; i < 14; i++) put('flower', best({ gen: inRing(3, 11.8), r: .2, margin: .1, k: 14 }), 0, { c: Math.floor(R(0, 5)), foot: .12 });

  // puddles (only visible in rain)
  for (let i = 0; i < 7; i++) {
    const s = R(.55, 1.05), p = best({ gen: inRing(1.8, 11.2), r: s * .5, margin: 0, k: 14 });
    if (p) { out.puddles.push({ x: p.x, z: p.z, s }); B.add(p.x, p.z, .2, 'puddle'); }
  }

  // golden acorns: hidden far apart, preferably tucked beside something
  const taken = [];
  for (let i = 0; i < 5; i++) {
    const p = best({
      gen: inRing(5, 11.8), r: .4, margin: .1, k: 70, cap: 1.5, noise: .6,
      score: (x, z, c) => -Math.min(c, 2.5) * .6 + Math.min(6, ...taken.map(t => Math.hypot(x - t.x, z - t.z))) * .5 - (Math.hypot(x - pond.x, z - pond.z) < pond.r + .5 ? 9 : 0),
    });
    if (p) { out.acorns.push(p); taken.push(p); B.add(p.x, p.z, .35, 'acorn'); }
  }
  while (out.acorns.length < 5) out.acorns.push({ x: R(-8, 8), z: R(-8, 8) });
  return out;
}
