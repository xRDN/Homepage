import * as THREE from 'three';
// Rarity tiers (drop chance %): N common, R rare, SR super rare, SSR legendary.
export const RAR = { N: { name: 'Common', w: 60, c: '#8fa39a' }, R: { name: 'Rare', w: 28, c: '#4c9be8' }, SR: { name: 'Super Rare', w: 10, c: '#a96be0' }, SSR: { name: 'Legendary', w: 2, c: '#f0b030' } };
export const SPECIES = [
  { id: 'minnow', n: 'Minnow', r: 'N', e: '🐟', c: 0xb8c7c2, c2: 0x8fa39a, s: .35 },
  { id: 'carp', n: 'Carp', r: 'N', e: '🐟', c: 0xb89a5a, c2: 0x8a6f3c, s: .5 },
  { id: 'sunfish', n: 'Sunfish', r: 'N', e: '🐠', c: 0xf2c94c, c2: 0xe08a2c, s: .42, tall: 1 },
  { id: 'koi', n: 'Koi', r: 'R', e: '🎏', c: 0xfff4e6, c2: 0xf08a3c, s: .6 },
  { id: 'trout', n: 'Rainbow Trout', r: 'R', e: '🐟', c: 0x7fb07a, c2: 0xe88aa0, s: .55 },
  { id: 'angel', n: 'Angelfish', r: 'R', e: '🐠', c: 0xdfe6ea, c2: 0x33414a, s: .5, tall: 1.3 },
  { id: 'puffer', n: 'Pufferfish', r: 'SR', e: '🐡', c: 0xf3e3b8, c2: 0xd8b86a, s: .5, round: 1 },
  { id: 'clown', n: 'Clownfish', r: 'SR', e: '🐠', c: 0xf08a2c, c2: 0xffffff, s: .42 },
  { id: 'lantern', n: 'Lanternfish', r: 'SR', e: '🔮', c: 0x2f5fa0, c2: 0x6fd6ff, s: .5, glow: 1 },
  { id: 'dragon', n: 'Golden Dragonfish', r: 'SSR', e: '🐉', c: 0xf0b030, c2: 0xff7a3c, s: .9, glow: 1 },
  { id: 'moonwhale', n: 'Moon Whale', r: 'SSR', e: '🐋', c: 0xc9c2f0, c2: 0x9a90d8, s: 1.05, round: 1, glow: 1 },
  { id: 'aurora', n: 'Aurora Koi', r: 'SSR', e: '🎏', c: 0x6fe8d0, c2: 0xff8fd0, s: .8, glow: 1 },
];
const rand = (a, b) => a + Math.random() * (b - a);
const pickSp = r => { const l = SPECIES.filter(s => s.r === r); return l[Math.floor(Math.random() * l.length)]; };
// Base odds are 60 / 28 / 10 / 2. Luck (rain, night, aurora) shifts weight from Common towards the rarer tiers.
const roll = (luck = 1) => {
  const w = { N: RAR.N.w, R: RAR.R.w * luck, SR: RAR.SR.w * luck, SSR: RAR.SSR.w * luck * luck };
  let x = Math.random() * (w.N + w.R + w.SR + w.SSR);
  for (const k of ['N', 'R', 'SR', 'SSR']) if ((x -= w[k]) < 0) return pickSp(k);
  return pickSp('N');
};

export function buildFish(sp) {
  const g = new THREE.Group();
  const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: .4, emissive: sp.glow ? c : 0, emissiveIntensity: sp.glow ? .6 : 0 });
  const m = mat(sp.c), m2 = mat(sp.c2);
  const body = new THREE.Mesh(new THREE.SphereGeometry(.5, 20, 14), m);
  body.scale.set(sp.round ? 1 : 1.5, sp.tall || (sp.round ? 1 : .7), sp.round ? 1 : .6); g.add(body);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(.35, .6, 4), m2);
  tail.rotation.z = -Math.PI / 2; tail.position.x = sp.round ? -.6 : -1; tail.scale.z = .3; g.add(tail);
  const fin = new THREE.Mesh(new THREE.ConeGeometry(.2, .35, 4), m2);
  fin.position.set(-.1, (sp.tall || .7) * .5 + .08, 0); fin.scale.z = .3; g.add(fin);
  const eyeM = new THREE.MeshBasicMaterial({ color: 0x151515 });
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 8), eyeM); e.position.set(sp.round ? .35 : .6, .1, s * (sp.round ? .35 : .27)); g.add(e); }
  g.scale.setScalar(sp.s);
  return g;
}

export function createFishing({ scene, pond, toast, sound }) {
  const dex = JSON.parse(localStorage.getItem('island.dex') || '{}');
  const swimmers = [];
  for (let i = 0; i < 5; i++) {
    const f = buildFish(pickSp(i < 3 ? 'N' : 'R')); f.scale.multiplyScalar(.8);
    f.userData = { a: rand(0, 6.28), r: rand(.6, 2), v: rand(.3, .7) }; scene.add(f); swimmers.push(f);
  }
  const bob = new THREE.Mesh(new THREE.SphereGeometry(.13, 12, 10), new THREE.MeshStandardMaterial({ color: 0xe8554e }));
  bob.visible = false; scene.add(bob);
  let st = 'idle', timer = 0, leap = null;
  const cond = { bite: 1, luck: 1, swim: 1, blocked: '' }; // set every frame by the weather
  const idle = () => { st = 'idle'; bob.visible = false; };
  return {
    dex, active: () => st !== 'idle', cancel: idle, setCond: c => Object.assign(cond, c),
    label: () => cond.blocked ? '🚫 ' + cond.blocked : st === 'bite' ? '❗ Reel in!' : st === 'wait' ? '🎣 Waiting…' : '🎣 Cast line',
    press() {
      if (cond.blocked && st === 'idle') return toast(cond.blocked, '#8fa39a');
      if (st === 'idle') {
        const a = rand(0, 6.28), r = rand(.5, 1.8);
        bob.position.set(pond.x + Math.cos(a) * r, .1, pond.z + Math.sin(a) * r); bob.visible = true;
        st = 'wait'; timer = rand(1.5, 4.5) / Math.max(cond.bite, .2); sound.splash();
      } else if (st === 'wait') { idle(); toast('Too early, it swam off 🐟', '#8fa39a'); }
      else {
        const sp = roll(cond.luck); dex[sp.id] = (dex[sp.id] || 0) + 1; localStorage.setItem('island.dex', JSON.stringify(dex));
        const f = buildFish(sp); f.position.copy(bob.position); scene.add(f);
        leap = { f, t: 0, from: bob.position.clone() }; idle(); sound.splash();
        const R = RAR[sp.r];
        toast(`${sp.e} ${sp.n} · ${sp.r} ${R.name}${sp.r === 'SSR' ? ' ✨' : ''}`, R.c);
        if (sp.r === 'SR' || sp.r === 'SSR') sound.chime();
      }
    },
    update(dt, t) {
      swimmers.forEach(f => {
        const u = f.userData; u.a -= u.v * cond.swim * dt / u.r;
        f.position.set(pond.x + Math.cos(u.a) * u.r, .09 + Math.sin(t * 3 + u.r) * .01, pond.z + Math.sin(u.a) * u.r);
        f.rotation.y = Math.PI / 2 - u.a;
      });
      if (st === 'wait') { bob.position.y = .1 + Math.sin(t * 4) * .02; if ((timer -= dt) <= 0) { st = 'bite'; timer = 1.2; sound.splash(); } }
      else if (st === 'bite') { bob.position.y = .02 + Math.abs(Math.sin(t * 20)) * .06; if ((timer -= dt) <= 0) { idle(); toast('It got away! 🐟', '#8fa39a'); } }
      if (leap) {
        const k = (leap.t += dt / 1.3), q = Math.min(k, 1);
        leap.f.position.set(leap.from.x + (pond.x - leap.from.x) * q * .3, .1 + Math.sin(Math.PI * q) * 2.4, leap.from.z + (pond.z - leap.from.z) * q * .3);
        leap.f.rotation.z = Math.cos(Math.PI * q) * .9; leap.f.rotation.y += dt * 6;
        if (k >= 1) { scene.remove(leap.f); leap = null; }
      }
    },
  };
}

export function renderDex(el, dex) {
  const got = SPECIES.filter(s => dex[s.id]).length;
  el.innerHTML = `<p class="dexn">${got}/${SPECIES.length} discovered · base odds: N 60% · R 28% · SR 10% · SSR 2% · rain, night and auroras improve your luck</p>` + SPECIES.map(s => dex[s.id]
    ? `<div class="fc" style="--rc:${RAR[s.r].c}"><b>${s.e}</b>${s.n}<br><small>${s.r} · ${RAR[s.r].name}</small><br>×${dex[s.id]}</div>`
    : `<div class="fc no" style="--rc:${RAR[s.r].c}"><b>❔</b>???<br><small>${s.r}</small></div>`).join('');
}
