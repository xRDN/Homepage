import { create } from 'zustand';
import * as THREE from 'three';

const prefs = (() => { try { return JSON.parse(localStorage.getItem('island.prefs') || '{}'); } catch { return {}; } })();
export const avatar = prefs.avatar || 'slime';
export const playerPos = new THREE.Vector3(0, 0, 14);              // read every frame, never React state
export const camState = { pos: new THREE.Vector3(10, 6, 14), look: new THREE.Vector3(0, 1, 0), prog: 0, on: true };
export const adv = { t: 0 };                                        // when dialogue last advanced (debounce for E)

export const useStory = create((set, get) => ({
  scene: 'prologue', trust: 75, lite: !!prefs.lite,
  objective: '', prompt: '', dialog: null, choice: null, ended: false,
  got: [false, false, false], gates: [false, false], boardDone: false, rootLevel: 0, tide: 0,
  say: (lines, then) => set({ dialog: { lines, i: 0, then } }),
  next: () => {
    const d = get().dialog; if (!d) return;
    adv.t = performance.now();
    if (d.i + 1 < d.lines.length) set({ dialog: { ...d, i: d.i + 1 } });
    else { set({ dialog: null }); d.then && d.then(); }
  },
  addTrust: n => set(s => ({ trust: Math.min(100, s.trust + n) })),
  resolveBoard: kind => {
    const numbers = kind === 'numbers';
    set(s => ({ choice: null, boardDone: true, rootLevel: 1, objective: '', trust: Math.min(100, s.trust + (numbers ? 34 : 22)) }));
    get().say([
      { who: 'Pip', text: numbers ? 'Just the numbers. Clean and plain. Nobody can argue with a total.' : 'The clerk’s name on the board too… it will sting, and it may make others afraid to come forward.' },
      { who: '', text: 'The Heartroot stirs. A single green leaf unfurls, and colour spills across the market.' },
    ], () => set({ ended: true }));
  },
}));
export const talk = lines => new Promise(r => useStory.getState().say(lines, r));
