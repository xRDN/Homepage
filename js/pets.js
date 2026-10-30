// Two island pets with their own habits. Walk up and feed one (E / tap) and it follows you around for a while.
//   Miso the cat: naps in sunny spots, sleeps by the campfire at night, runs for cover when it rains, hisses at the fog in haunted mode.
//   Biscuit the duck: lives at the pond, swims and dabbles, loves rain, skates on the ice when it freezes, tucks its head in at night.
// Pets are local to each visitor (like the weather); nothing here goes over the network.
import * as THREE from 'three';
import { M, sph, cyl, mk } from './props.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const FOLLOW = 150; // seconds a fed pet tags along

function buildCat() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const fur = M(0xf0a25a, .8), light = M(0xfff1dc, .8), dark = M(0x2a2030, .4), pink = M(0xff9db0, .7);
  const torso = mk(sph(.22, 16, 12), fur, [0, .26, 0], body); torso.scale.set(.85, .8, 1.35);
  mk(sph(.13, 12, 10), light, [0, .22, .14], body).scale.set(.9, .8, 1.1);                 // belly
  const head = new THREE.Group(); head.position.set(0, .42, .26); body.add(head);
  mk(sph(.16, 16, 12), fur, [0, 0, 0], head).scale.set(1.05, .92, .95);
  mk(sph(.08, 10, 8), light, [0, -.045, .1], head).scale.set(1.2, .7, .8);                  // muzzle
  for (const s of [-1, 1]) {
    const ear = mk(new THREE.ConeGeometry(.065, .12, 4), fur, [s * .085, .14, -.01], head); ear.rotation.z = -s * .25;
    mk(new THREE.ConeGeometry(.035, .07, 4), pink, [0, -.01, .02], ear);
    mk(sph(.026, 8, 8), dark, [s * .06, .02, .135], head);                                 // eyes
  }
  mk(sph(.018, 6, 6), pink, [0, -.025, .155], head);                                        // nose
  const tail = new THREE.Group(); tail.position.set(0, .3, -.27); body.add(tail);
  const segs = [];
  let prev = tail;
  for (let i = 0; i < 5; i++) { const s = new THREE.Group(); s.position.set(0, i ? .07 : 0, 0); prev.add(s); mk(sph(.045 - i * .004, 8, 6), i === 4 ? light : fur, [0, .035, 0], s); segs.push(s); prev = s; }
  const legs = [[-.09, .15], [.09, .15], [-.09, -.15], [.09, -.15]].map(([x, z]) => mk(cyl(.035, .03, .16, 6), fur, [x, .08, z], body));
  return { g, body, head, tail: segs, legs, eyes: head.children.filter(m => m.material === dark), dark };
}

function buildDuck() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const white = M(0xfbf6ea, .6), orange = M(0xf59a2c, .5), dark = M(0x1e1a24, .3);
  const torso = mk(sph(.2, 16, 12), white, [0, .24, 0], body); torso.scale.set(.9, .78, 1.25);
  mk(new THREE.ConeGeometry(.07, .14, 6), white, [0, .3, -.24], body).rotation.x = -2.1;  // tail tuft
  for (const s of [-1, 1]) { const w = mk(sph(.12, 10, 8), white, [s * .15, .27, -.02], body); w.scale.set(.35, .65, 1.1); }
  const head = new THREE.Group(); head.position.set(0, .45, .17); body.add(head);
  mk(sph(.12, 14, 10), white, [0, 0, 0], head);
  const beak = mk(new THREE.BoxGeometry(.1, .035, .12), orange, [0, -.02, .13], head); beak.scale.set(1, 1, 1);
  for (const s of [-1, 1]) mk(sph(.02, 8, 8), dark, [s * .065, .03, .085], head);
  const feet = [-1, 1].map(s => mk(new THREE.BoxGeometry(.07, .015, .1), orange, [s * .07, .01, .05], body));
  const legs = [-1, 1].map(s => mk(cyl(.015, .015, .12, 5), orange, [s * .07, .07, .02], body));
  return { g, body, head, feet, legs, eyes: head.children.filter(m => m.material === dark), dark };
}

export function createPets(env) {
  const { scene, obstacles, POND, label } = env;
  const pets = [
    { id: 'cat', name: 'Miso', emoji: '🐱', food: '🐟', ...buildCat(), sp: 2.2, mode: 'idle', goal: new THREE.Vector3(), t: 1, follow: 0, napT: 0, sleep: 0, walk: 0, h: 1.0 },
    { id: 'duck', name: 'Biscuit', emoji: '🦆', food: '🍞', ...buildDuck(), sp: 1.6, mode: 'idle', goal: new THREE.Vector3(), t: 1, follow: 0, napT: 0, sleep: 0, walk: 0, h: 1.0 },
  ];
  const inPond = (x, z, m = 0) => Math.hypot(x - POND.x, z - POND.z) < POND.r - m;
  const clear = (x, z, pad = .35) => Math.hypot(x, z) < 11.8 && obstacles.every(([ox, oz, r]) => Math.hypot(x - ox, z - oz) > r + pad);
  const spot = (cx, cz, r, ok = (x, z) => clear(x, z) && !inPond(x, z, -.4)) => {
    for (let i = 0; i < 14; i++) { const a = rand(0, 6.283), d = r * Math.sqrt(Math.random()), x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d; if (ok(x, z)) return new THREE.Vector3(x, 0, z); }
    return null;
  };
  for (const p of pets) {
    const start = p.id === 'duck' ? spot(POND.x, POND.z, POND.r * .7, (x, z) => inPond(x, z, .4)) : spot(-3, 3, 4);
    p.g.position.copy(start || new THREE.Vector3(p.id === 'duck' ? POND.x : 2, 0, p.id === 'duck' ? POND.z : 2)); p.g.rotation.y = rand(0, 6.28);
    p.g.scale.setScalar(1.2); scene.add(p.g); Object.assign(p, label(p.name), { mesh: p.g, goal: p.g.position.clone() });
  }

  // move with soft collisions (the duck may enter the pond; the cat never does)
  function walk(p, tx, tz, dt, sp) {
    const q = p.g.position, dx = tx - q.x, dz = tz - q.z, d = Math.hypot(dx, dz);
    if (d < .12) { p.walk = 0; return true; }
    const k = Math.min(1, sp * dt / d); q.x += dx * k; q.z += dz * k;
    for (const [ox, oz, r] of obstacles) { const ex = q.x - ox, ez = q.z - oz, e = Math.hypot(ex, ez) || 1, rr = r + .22; if (e < rr) { q.x = ox + ex / e * rr; q.z = oz + ez / e * rr; } }
    if (p.id === 'cat' && inPond(q.x, q.z, -.35)) { const ex = q.x - POND.x, ez = q.z - POND.z, e = Math.hypot(ex, ez) || 1; q.x = POND.x + ex / e * (POND.r + .35); q.z = POND.z + ez / e * (POND.r + .35); }
    const r = Math.hypot(q.x, q.z); if (r > 12.2) { q.x *= 12.2 / r; q.z *= 12.2 / r; }
    p.g.rotation.y += wrap(Math.atan2(dx, dz) - p.g.rotation.y) * Math.min(1, dt * 8);
    p.walk = 1; return false;
  }

  let greetT = 8;
  // w: { me, night, rain, ice, horror, shelterSpot(), fireSpot, catBed, fly(), momo, bobber, lookUp }
  function tick(dt, t, w) {
    const mp = w.me && w.me.mesh.position;
    // the two pets say hello when they bump into each other
    const [c0, d0] = pets, pd = Math.hypot(c0.g.position.x - d0.g.position.x, c0.g.position.z - d0.g.position.z);
    if ((greetT -= dt) <= 0 && pd < 1.6 && c0.mode === 'idle' && d0.mode === 'idle' && c0.sleep < .3) { greetT = 40; env.say(c0, 'mrrp? 🐾'); setTimeout(() => env.say(d0, 'quack. 🦆'), 900); }
    for (const p of pets) {
      const q = p.g.position, cat = p.id === 'cat';
      if (p.follow > 0) p.follow -= dt;
      if (w.night && !p.wasNight && cat) p.play = Math.random() < .7 ? rand(14, 26) : 0; p.wasNight = w.night;
      if (p.jump > 0) p.jump = Math.max(0, p.jump - dt);
      let moved = false;
      const scared = w.horror > .5 && mp;
      // --- choose what to do ---
      if (p.follow > 0 && mp || scared) {
        p.mode = 'follow';
        const behind = .9 + (cat ? .3 : .9), d = Math.hypot(mp.x - q.x, mp.z - q.z);
        if (d > behind + .4) moved = !walk(p, mp.x, mp.z, dt, Math.min(5.2, p.sp * (d > 4 ? 2.4 : 1.3)));
        else p.g.rotation.y += wrap(Math.atan2(mp.x - q.x, mp.z - q.z) - p.g.rotation.y) * Math.min(1, dt * 4);
        if (scared && Math.random() < dt * .08) env.say(p, cat ? pick(['hsss!', '😾', '…mrrr?']) : pick(['quack?!', '…', '🫣']));
        else if (!scared && Math.random() < dt * .04) env.say(p, cat ? pick(['mrrp', 'meow~', '😺']) : pick(['quack!', 'quack quack', '🦆']));
      } else if (w.night && cat && p.play > 0 && w.fly) { // first, a little firefly hunt
        p.mode = 'play'; p.play -= dt;
        if (!p.prey || (p.preyT -= dt) <= 0) { p.prey = w.fly(); p.preyT = rand(1.5, 3); }
        if (p.prey) { moved = !walk(p, p.prey.x, p.prey.z, dt, p.sp * 1.6); if (!moved && !p.jump) { p.jump = .5; if (Math.random() < .3) env.say(p, pick(['!', '*pounce*', 'mrrr!'])); p.preyT = 0; } }
      } else if (w.night) { // bedtime: the cat curls up beside Momo (or by the fire), the duck at the pond edge
        p.mode = 'sleep';
        if (!p.bed) p.bed = cat ? (w.catBed || w.fireSpot || w.shelterSpot('cat')) : spot(POND.x, POND.z, POND.r + 1.1, (x, z) => !inPond(x, z, -.5) && clear(x, z) && Math.hypot(x - POND.x, z - POND.z) < POND.r + 1.2) || new THREE.Vector3(POND.x + POND.r + .6, 0, POND.z);
        moved = !walk(p, p.bed.x, p.bed.z, dt, p.sp);
      } else if (cat && w.rain > .25) { // cats hate rain
        p.mode = 'shelter'; p.bed = null;
        const s = w.shelterSpot('cat'); moved = s ? !walk(p, s.x, s.z, dt, p.sp * 2) : false;
      } else {
        p.mode = 'idle'; p.bed = null;
        if (p.excite > 0 && mp) { p.excite -= dt; p.goal.set(mp.x + Math.sin(t) * .3, 0, mp.z + 1); p.t = Math.max(p.t, 1); } // someone caught a fish!
        else if (!cat && w.rain > .2 && w.momo && p.tagMomo) { p.goal.set(w.momo.x + .7, 0, w.momo.z + .5); p.t = Math.max(p.t, .5); } // splashing about with Momo
        else if (!cat && w.bobber && !w.ice && p.nosy !== w.casts) { p.nosy = w.casts; if (Math.random() < .7) { p.goal.set(w.bobber.x + rand(-.5, .5), 0, w.bobber.z + rand(-.5, .5)); p.t = 6; if (Math.random() < .6) env.say(p, 'quack? 👀'); } } // curious about your bobber
        if ((p.t -= dt) <= 0) {
          if (!cat) p.tagMomo = w.rain > .2 && Math.random() < .5;
          if (cat) {
            const napping = Math.random() < .35;           // sun naps
            const g = napping ? spot(0, 2, 8) : mp && Math.random() < .35 ? spot(mp.x, mp.z, 2.5) : spot(0, 2, 9);
            if (g) p.goal.copy(g); p.t = napping ? rand(12, 22) : rand(4, 9); p.napT = napping ? p.t : 0;
          } else {
            const swim = !w.ice && (Math.random() < .65 || w.rain > .2);
            const g = swim ? spot(POND.x, POND.z, POND.r * .75, (x, z) => inPond(x, z, .35)) : spot(POND.x, POND.z, POND.r + 2.2, (x, z) => clear(x, z) && Math.hypot(x - POND.x, z - POND.z) < POND.r + 2.5);
            if (g) p.goal.copy(g); p.t = rand(4, 10);
            if (w.rain > .2 && Math.random() < .5) env.say(p, 'quack! 🌧️');
          }
        }
        const dm = mp ? Math.hypot(mp.x - q.x, mp.z - q.z) : 99;
        if (dm < 2.3 && p.napT <= 0 && !(p.excite > 0)) { p.walk = 0; p.g.rotation.y += wrap(Math.atan2(mp.x - q.x, mp.z - q.z) - p.g.rotation.y) * Math.min(1, dt * 3); p.t = Math.max(p.t, 1.5); } // notices you and waits to be fed
        else moved = !walk(p, p.goal.x, p.goal.z, dt, p.sp);
        if (!moved && cat) p.napT -= dt;
      }
      // --- pose & animation ---
      const swimming = !cat && inPond(q.x, q.z, .1) && !w.ice;
      const asleep = p.mode === 'sleep' && !moved;
      const napping = cat && p.mode === 'idle' && !moved && p.napT > 0;
      p.sleep += ((asleep || napping ? 1 : 0) - p.sleep) * Math.min(1, dt * 2.5);
      const s = p.sleep, step = moved ? t * (cat ? 14 : 11) : 0;
      if (cat) {
        p.body.position.y = (moved ? Math.abs(Math.sin(step)) * .03 : 0) + (p.jump > 0 ? Math.sin(Math.PI * (1 - p.jump / .5)) * .35 : 0);
        p.body.scale.set(1 + s * .15, 1 - s * .35, 1 - s * .1);                                   // curls into a loaf
        p.head.position.set(s * .08, .42 - s * .2, .26 - s * .1); p.head.rotation.set(s * .4 + (moved ? 0 : Math.sin(t * .7) * .06) - (w.lookUp && !moved && s < .3 ? .55 : 0) - (p.mode === 'play' ? .35 : 0), s * .5, 0);
        p.legs.forEach((l, i) => { l.rotation.x = moved ? Math.sin(step + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * .6 : 0; l.visible = s < .6; });
        p.tail.forEach((g, i) => { g.rotation.x = (i ? .25 : -.7 + s * 1.4) + (s > .5 ? 0 : Math.sin(t * 2.2 + i * .7) * .12); g.rotation.z = s * .55 + Math.sin(t * 1.6 + i) * (s > .5 ? .03 : .18); }); // tail wraps round when asleep
      } else {
        const bob = swimming ? Math.sin(t * 2 + q.x) * .02 : 0;
        p.body.position.y = swimming ? -.14 + bob : moved ? Math.abs(Math.sin(step)) * .025 : w.ice && inPond(q.x, q.z) ? .05 : 0;
        p.body.rotation.z = moved && !swimming ? Math.sin(step) * .14 : 0;                       // waddle
        p.feet.forEach(f => f.visible = !swimming); p.legs.forEach(l => l.visible = !swimming);
        const dabble = swimming && !moved && Math.sin(t * .9 + q.z) > .85;                         // tail up, head under
        p.body.rotation.x = dabble ? -1.1 : 0;
        p.head.position.set(0, .45 - s * .12, .17 - s * .22); p.head.rotation.set(w.lookUp && !moved && s < .3 ? -.5 : 0, s * 2.4, 0); // head tucked under the wing
      }
      // haunted: eyes glow red
      const red = w.horror > .5;
      if (p.red !== red) { p.red = red; p.eyes.forEach(e => e.material = red ? new THREE.MeshBasicMaterial({ color: 0xff3030 }) : p.dark); }
      if (s > .9 && Math.random() < dt * .05) env.say(p, cat ? 'zzz… 🐾' : 'zzz…');
    }
  }

  return {
    list: pets,
    tick,
    // the closest pet within reach of the visitor, or null
    near(mp, r = 1.7) { let best = null, bd = r; for (const p of pets) { const d = Math.hypot(mp.x - p.g.position.x, mp.z - p.g.position.z); if (d < bd) { bd = d; best = p; } } return best; },
    caught(at) { // the cat comes running when you land a fish
      const c = pets[0]; if (c.sleep > .5 || c.mode === 'sleep' || Math.hypot(at.x - c.g.position.x, at.z - c.g.position.z) > 12) return;
      c.excite = 6; c.napT = 0; env.say(c, pick(['👀🐟', 'mrrp?! 🐟', '*stares at fish*']));
    },
    label: p => p.follow > 0 ? `🤲 Pet ${p.name}` : `${p.food} Feed ${p.name}`,
    interact(p) {
      p.napT = 0; p.sleep = 0;
      if (p.follow > 0) { p.follow = Math.max(p.follow, 60); env.say(p, p.id === 'cat' ? pick(['purrrr 💕', '*headbutt*', 'mrrrp 💕']) : pick(['quack 💕', '*happy flap*', '💛'])); env.sound(p.id, true); return 'pet'; }
      p.follow = FOLLOW; env.say(p, p.id === 'cat' ? 'nom nom 🐟 …mrrp!' : 'QUACK! 🍞'); env.sound(p.id, false); return 'fed';
    },
  };
}
