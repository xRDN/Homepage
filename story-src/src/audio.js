// Tiny synthesized voice: Pip beeps, a clock chime, soft clicks. No audio files.
let ctx;
const A = () => ctx || (ctx = new (window.AudioContext || window.webkitAudioContext)());
['pointerdown', 'keydown'].forEach(e => addEventListener(e, () => { try { A().resume(); } catch {} }, { once: false }));
function blip(f, d = .08, v = .05, f2 = f, type = 'sine', when = 0) {
  try {
    const c = A(), t = c.currentTime + when, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + d * .2); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + .02);
  } catch {}
}
export const chirp = n => { for (let i = 0; i < Math.min(Math.max(n, 1), 4); i++) blip(600 + Math.random() * 500, .07, .035, 900 + Math.random() * 400, 'square', i * .09); };
export const pop = () => blip(800, .12, .05, 1200);
export const chime = () => { blip(523, 1.2, .08); blip(659, 1.2, .06, 659, 'sine', .15); blip(784, 1.6, .06, 784, 'sine', .3); };
