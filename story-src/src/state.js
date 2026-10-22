import { create } from 'zustand';
import * as THREE from 'three';
import { chirp } from './audio';

const prefs = (() => { try { return JSON.parse(localStorage.getItem('island.prefs') || '{}'); } catch { return {}; } })();
export const avatar = prefs.avatar || 'slime';
export const playerPos = new THREE.Vector3(0, 0, 52);               // read every frame, never React state
export const camRig = { yaw: 0, pitch: .66, dist: 11.4 };
export const camState = { pos: new THREE.Vector3(10, 6, 14), look: new THREE.Vector3(0, 1, 0), prog: 0 };

export const useStory = create((set, get) => ({
  scene: 'storybook', sunMesh: null, trust: 75, lite: !!prefs.lite, captions: prefs.captions ?? true,
  card: '', pip: { icons: '', cap: '' }, prompt: '', stage: 0, last: performance.now(),
  got: [false, false, false], gates: [false, false], slow: 0, slots: [0, 0, 0], solved: false, stamp: null, gears: 0, tide: 0, ended: false,
  addTrust: n => set(s => ({ trust: Math.min(100, s.trust + n) })),
  progress: patch => set({ ...patch, last: performance.now() }),            // resets the idle-hint timer
  toggleCaptions: () => {
    const c = !get().captions; set({ captions: c });
    try { localStorage.setItem('island.prefs', JSON.stringify({ ...prefs, ...JSON.parse(localStorage.getItem('island.prefs') || '{}'), captions: c })); } catch {}
  },
}));
export const wait = ms => new Promise(r => setTimeout(r, ms));
// Pip "speaks" in picture bubbles + beeps. `cap` is only shown when captions are on.
export function pipSay(icons, cap = '', ms = 2400) {
  chirp(icons.length);
  useStory.setState({ pip: { icons, cap } });
  setTimeout(() => { if (useStory.getState().pip.icons === icons) useStory.setState({ pip: { icons: '', cap: '' } }); }, ms);
  return wait(ms);
}
export function card(text, ms = 3200) {
  useStory.setState({ card: text });
  setTimeout(() => useStory.setState({ card: '' }), ms);
  return wait(ms);
}
