import { getProject } from '@theatre/core';
import { camState } from './state';
// Keyframes live here once. They are fed to Theatre.js as a sequence; if Theatre does not animate
// (for example its state format changed), a tiny tween plays the same keys so the story never stalls.
const ease = t => t * t * (3 - 2 * t);
function sample(keys, t) {
  const o = {};
  for (const k in keys) {
    const ks = keys[k]; let i = 0;
    while (i < ks.length - 2 && t > ks[i + 1][0]) i++;
    const [t0, v0] = ks[i], [t1, v1] = ks[i + 1];
    const u = Math.min(1, Math.max(0, (t - t0) / (t1 - t0 || 1)));
    o[k] = v0 + (v1 - v0) * ease(u);
  }
  return o;
}
const apply = (v, prog) => { camState.pos.set(v.px, v.py, v.pz); camState.look.set(v.lx, v.ly, v.lz); camState.prog = prog; };
function tween(c) {
  return new Promise(res => {
    const t0 = performance.now();
    const tick = () => {
      const t = Math.min((performance.now() - t0) / 1000, c.length);
      apply(sample(c.keys, t), t / c.length);
      t < c.length ? requestAnimationFrame(tick) : res();
    };
    tick();
  });
}
function theatreState(name, c) {
  const trackData = {}, trackIdByPropPath = {};
  for (const k in c.keys) {
    const id = `${name}_${k}`;
    trackData[id] = { type: 'BasicKeyframedTrack', __debugName: `Cam:["${k}"]`, keyframes: c.keys[k].map(([t, v], i) => ({ id: `${id}_${i}`, position: t, connectedRight: true, handles: [.5, 1, .5, 0], value: v })) };
    trackIdByPropPath[`["${k}"]`] = id;
  }
  return { sheetsById: { Cut: { staticOverrides: { byObject: {} }, sequence: { subUnitsPerUnit: 30, length: c.length, type: 'PositionalSequence', tracksByObject: { Cam: { trackData, trackIdByPropPath } } } } }, definitionVersion: '0.4.0', revisionHistory: [] };
}
export async function playCutscene(name, c) {
  camState.on = true;
  try {
    const project = getProject('LongSpring-' + name, { state: theatreState(name, c) });
    await project.ready;
    const seq = project.sheet('Cut').sequence;
    const obj = project.sheet('Cut').object('Cam', Object.fromEntries(Object.keys(c.keys).map(k => [k, c.keys[k][0][1]])));
    let first = null, changed = false;
    const un = obj.onValuesChange(v => {
      if (!first) first = { ...v }; else if (!changed) changed = Object.keys(v).some(k => Math.abs(v[k] - first[k]) > 1e-4);
      apply(v, seq.position / c.length);
    });
    const done = seq.play({ iterationCount: 1, range: [0, c.length] });
    const stuck = await Promise.race([done.then(() => false), new Promise(r => setTimeout(() => r(!changed), 600))]);
    if (!stuck) await done;
    un();
    if (stuck || !changed) { seq.pause(); return tween(c); }
  } catch { return tween(c); }
}
