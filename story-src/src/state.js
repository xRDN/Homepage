import { create } from 'zustand';
import { chirp } from './audio';
import { PAGES } from './story';

const prefs = (() => { try { return JSON.parse(localStorage.getItem('island.prefs') || '{}'); } catch { return {}; } })();
export const avatar = prefs.avatar || 'slime';
export const rig = { x: 0 };                                          // camera x, for light and sky
export const vis = { trust: PAGES[0].trust / 100, dark: 0 };           // smoothed look values read by sky, light and effects
export const ptr = { wx: 0, wy: 3, wxw: 0, wzw: 6 };                  // pointer on the page plane / on the water

export const useStory = create((set, get) => ({
  page: 0, done: PAGES.map(() => false), step: {}, trust: PAGES[0].trust, dark: 0,
  lite: !!prefs.lite, captions: prefs.captions ?? true, card: '', sunMesh: null, stamp: null, gears: 0, ended: false,
  go: i => {
    const n = Math.max(0, Math.min(PAGES.length - 1, i)), P = PAGES[n];
    set({ page: n, trust: P.trust, dark: P.dark || 0 }); chirp(2);
    if (P.ch) card(P.ch, 2800);
  },
  next: () => { const s = get(); if (s.page + 1 >= PAGES.length) set({ ended: true }); else s.go(s.page + 1); },
  bump: (k, n = 1) => set(s => ({ step: { ...s.step, [k]: (s.step[k] || 0) + n } })),
  finish: (i, boost = 6) => set(s => { if (s.done[i]) return {}; const d = [...s.done]; d[i] = true; return { done: d, trust: Math.min(100, s.trust + boost) }; }),
  toggleCaptions: () => {
    const c = !get().captions; set({ captions: c });
    try { localStorage.setItem('island.prefs', JSON.stringify({ ...JSON.parse(localStorage.getItem('island.prefs') || '{}'), captions: c })); } catch {}
  },
}));
export function card(text, ms = 3000) { useStory.setState({ card: text }); setTimeout(() => useStory.setState({ card: '' }), ms); }
