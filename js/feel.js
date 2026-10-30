// Weather you can feel: footprints in snow and mud that slowly fill in, leaves that pile up in the wind and scatter
// when you walk through them, lamp light glinting in the puddles at night, and breath puffs in the cold.
import * as THREE from 'three';

const rand = (a, b) => a + Math.random() * (b - a);

export function createFeel({ scene, puddles, lamps, dotTex, POND }) {
  // ---- footprints: a pool of flat ovals, oldest reused first ----
  const PRINTS = 110, printGeo = new THREE.CircleGeometry(1, 12);
  const prints = Array.from({ length: PRINTS }, () => {
    const m = new THREE.Mesh(printGeo, new THREE.MeshBasicMaterial({ color: 0x9fb3c8, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 1; scene.add(m); return { m, age: 0, life: 1, a0: .5 };
  });
  let pi = 0;
  const trail = new WeakMap(); // walker -> { x, z, side }
  function stamp(x, z, heading, side, small, snow) {
    const p = prints[pi = (pi + 1) % PRINTS];
    const ox = Math.cos(heading) * side * (small ? .05 : .1), oz = -Math.sin(heading) * side * (small ? .05 : .1);
    p.m.position.set(x + ox, .018, z + oz); p.m.rotation.z = heading;
    p.m.scale.set(small ? .045 : .075, small ? .05 : .12, 1);
    p.m.material.color.setHex(snow ? 0x9fb3c8 : 0x4a3a2a); p.a0 = snow ? .55 : .3;
    p.age = 0; p.life = snow ? 40 : 25; p.m.visible = true;
  }

  // ---- leaves on the ground ----
  const LEAVES = 70, leafGeo = new THREE.PlaneGeometry(.16, .09), LC = [0xd9822b, 0xe8b03a, 0xb5532a, 0x9a7a2a];
  const leaves = Array.from({ length: LEAVES }, (_, i) => {
    const m = new THREE.Mesh(leafGeo, new THREE.MeshStandardMaterial({ color: LC[i % 4], roughness: .9, side: THREE.DoubleSide, transparent: true, opacity: 0 }));
    m.visible = false; scene.add(m); return { m, v: new THREE.Vector3(), y: 0, on: false, spin: 0 };
  });
  let leafAcc = 0;

  // ---- lamp glints in puddles (a soft warm smear on the water, facing up) ----
  const glintTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d'); const r = g.createRadialGradient(32, 64, 2, 32, 64, 60); r.addColorStop(0, 'rgba(255,230,170,1)'); r.addColorStop(.35, 'rgba(255,200,120,.45)'); r.addColorStop(1, 'rgba(255,190,110,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const glints = [];
  for (const pd of puddles) {
    let best = null, bd = 2.8;
    for (const l of lamps) { const d = Math.hypot(l.x - pd.position.x, l.z - pd.position.z); if (d < bd) { bd = d; best = l; } }
    if (!best) continue;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(.45, .9), new THREE.MeshBasicMaterial({ map: glintTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.rotation.x = -Math.PI / 2; m.rotation.z = Math.atan2(best.x - pd.position.x, best.z - pd.position.z);
    m.position.set(pd.position.x + (best.x - pd.position.x) * .18, .03, pd.position.z + (best.z - pd.position.z) * .18); m.renderOrder = 2;
    scene.add(m); glints.push(m);
  }

  // ---- breath puffs ----
  const puffs = Array.from({ length: 18 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); s.visible = false; scene.add(s); return { s, age: 0, v: new THREE.Vector3() }; });
  let pfi = 0;
  const breathT = new WeakMap();
  function puff(o, h) {
    const p = puffs[pfi = (pfi + 1) % puffs.length], q = o.mesh.position, a = o.mesh.rotation.y;
    p.s.position.set(q.x + Math.sin(a) * .5, (o.y || 0) + h, q.z + Math.cos(a) * .5); p.v.set(Math.sin(a) * .35, .25, Math.cos(a) * .35);
    p.age = 0; p.s.visible = true;
  }

  return {
    counts: () => ({ prints: prints.filter(p => p.m.visible).length, leaves: leaves.filter(l => l.on).length, glints: glints.filter(m => m.visible).length, puffs: puffs.filter(p => p.s.visible).length }),
    /**
     * @param w.walkers [{ o, small, h }]  w.snow 0..1  w.wet 0..1  w.ice bool  w.wind 0..1  w.WD {x,z}  w.leafA 0..1
     * @param w.lampOn 0..1  w.cold bool  w.sheltered(x,z)  w.kick [{x,z}]  w.rain 0..1  w.snowing 0..1
     */
    tick(dt, t, w) {
      // footprints
      const snowy = w.snow > .35, muddy = !snowy && w.wet > .5;
      if (snowy || muddy) for (const { o, small } of w.walkers) {
        const q = o.mesh.position, tr = trail.get(o) || { x: q.x, z: q.z, side: 1 };
        if ((o.y || 0) > .05 || w.sheltered(q.x, q.z) || Math.hypot(q.x - POND.x, q.z - POND.z) < POND.r) { tr.x = q.x; tr.z = q.z; trail.set(o, tr); continue; }
        const d = Math.hypot(q.x - tr.x, q.z - tr.z);
        if (d > (small ? .22 : .42)) { stamp(q.x, q.z, Math.atan2(q.x - tr.x, q.z - tr.z), tr.side, small, snowy); tr.side = -tr.side; tr.x = q.x; tr.z = q.z; }
        trail.set(o, tr);
      }
      const fill = 1 + w.snowing * 2.5 + w.rain * 1.5; // fresh snow / rain fills prints faster
      for (const p of prints) {
        if (!p.m.visible) continue;
        p.age += dt * fill; const u = p.age / p.life;
        p.m.material.opacity = p.a0 * Math.max(0, 1 - u) * Math.min(1, p.age * 6);
        if (u >= 1 || (!snowy && !muddy && u > .3)) p.m.visible = false;
      }

      // leaves: settle while the wind blows them about, drift along the ground, scatter when kicked, fade when calm
      if (w.leafA > .25) { leafAcc += dt * 4 * w.leafA; while (leafAcc > 1) { leafAcc--; const l = leaves.find(x => !x.on); if (!l) break; const a = rand(0, 6.28), r = 11 * Math.sqrt(Math.random()); if (Math.hypot(Math.cos(a) * r - POND.x, Math.sin(a) * r - POND.z) < POND.r + .2) continue; l.on = true; l.m.visible = true; l.m.position.set(Math.cos(a) * r, 3, Math.sin(a) * r); l.y = 3; l.v.set(w.WD.x * 2, -1.2, w.WD.z * 2); l.spin = rand(-4, 4); l.m.material.opacity = 1; } }
      for (const l of leaves) {
        if (!l.on) continue;
        const q = l.m.position;
        for (const k of w.kick) if (l.y < .05 && Math.hypot(q.x - k.x, q.z - k.z) < .55) { const dx = q.x - k.x, dz = q.z - k.z, d = Math.hypot(dx, dz) || 1; l.v.set(dx / d * 2.2, 2.4, dz / d * 2.2); l.y = .06; l.spin = rand(-8, 8); }
        if (l.y > .02) { l.v.y -= 6 * dt; l.y = Math.max(.02, l.y + l.v.y * dt); q.x += l.v.x * dt; q.z += l.v.z * dt; l.m.rotation.set(-Math.PI / 2 + Math.sin(t * 5 + q.x) * .6, 0, l.m.rotation.z + l.spin * dt); if (l.y <= .02) { l.v.set(0, 0, 0); l.m.rotation.set(-Math.PI / 2, 0, rand(0, 6.28)); } }
        else { q.x += w.WD.x * w.wind * w.wind * .35 * dt; q.z += w.WD.z * w.wind * w.wind * .35 * dt; } // tumble along in strong gusts
        q.y = l.y;
        const r = Math.hypot(q.x, q.z); if (r > 12.2) { l.on = false; l.m.visible = false; continue; }
        if (w.leafA < .1) { l.m.material.opacity -= dt / 30; if (l.m.material.opacity <= 0) { l.on = false; l.m.visible = false; } }
      }

      // lamp glints: only on wet nights, shimmering when it rains
      const gA = w.wet * w.lampOn * (1 - w.snow) * .75;
      glints.forEach((m, i) => { m.visible = gA > .02; m.material.opacity = gA * (1 - w.rain * .35 * (.5 + .5 * Math.sin(t * 7 + i))); m.scale.y = 1 + w.rain * .3 * Math.sin(t * 5 + i); });

      // breath puffs in the cold (not by the fire, not while asleep)
      if (w.cold) for (const { o, h, small } of w.walkers) {
        if (small || o.sleep) continue;
        const left = (breathT.get(o) ?? rand(0, 2)) - dt;
        if (left <= 0) { puff(o, h); breathT.set(o, rand(2.2, 3.4)); } else breathT.set(o, left);
      }
      for (const p of puffs) {
        if (!p.s.visible) continue;
        p.age += dt; const u = p.age / 1.6;
        p.s.position.addScaledVector(p.v, dt); p.s.position.x += w.WD.x * w.wind * dt; p.s.position.z += w.WD.z * w.wind * dt;
        p.s.scale.setScalar(.12 + u * .4); p.s.material.opacity = .45 * Math.sin(Math.PI * Math.min(u, 1));
        if (u >= 1) p.s.visible = false;
      }
    },
  };
}
