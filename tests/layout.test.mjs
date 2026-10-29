import { createLayout } from '../js/layout.js';
let bad = 0, t0 = performance.now(), stat = {};
const solids = o => [...o.props.filter(p => p.r > 0).map(p => ({ x: p.x, z: p.z, r: p.r * (p.k === 'tree' ? p.s : 1), k: p.k })), ...o.stations.map(s => ({ x: s.x, z: s.z, r: 1.4, k: 'st' }))];
for (let seed = 1; seed <= 400; seed++) for (const [l, p] of [[3, 3], [1, 1], [6, 7]]) {
  const o = createLayout({ seed, links: l, projects: p });
  const a = JSON.stringify(createLayout({ seed, links: l, projects: p }));
  if (a !== JSON.stringify(o)) { console.log('nondeterministic', seed); bad++; }
  const S = solids(o);
  for (let i = 0; i < S.length; i++) {
    if (Math.hypot(S[i].x, S[i].z) > 12.9) { bad++; console.log('rim', seed, l, p, S[i]); }
    for (let j = i + 1; j < S.length; j++) {
      const d = Math.hypot(S[i].x - S[j].x, S[i].z - S[j].z);
      if (!(S[i].k==='st'&&S[j].k==='st'&&p>3) && d < S[i].r + S[j].r - 0.05) { bad++; if (bad < 15) console.log('overlap', seed, l, p, S[i].k, S[j].k, d.toFixed(2)); }
    }
    // not on spawn, not in pond
    if (Math.hypot(S[i].x, S[i].z) < 1.2) { bad++; console.log('spawn', seed, S[i]); }
    if (Math.hypot(S[i].x - o.pond.x, S[i].z - o.pond.z) < o.pond.r) { bad++; console.log('pond', seed, S[i]); }
  }
  if (o.shelters.length < 2) { bad++; console.log('shelters', seed, l, p, o.shelters.length); }
  if (l == 3 && p == 3) for (const k of ['tree', 'rock', 'bush', 'flower', 'mushroom', 'lamp', 'bench', 'windmill', 'fence', 'campfire']) { stat[k] = (stat[k] || 0) + o.props.filter(x => x.k === k).length; }
}
console.log('bad', bad, 'ms', (performance.now() - t0).toFixed(0));
console.log(Object.fromEntries(Object.entries(stat).map(([k, v]) => [k, (v / 400).toFixed(1)])));
if (bad) process.exit(1);
