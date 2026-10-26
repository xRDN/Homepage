// All sound is synthesized live: a drone that follows the tension, a three-note bell, nib, pencil, coin, footsteps, a choir hum.
let ctx, master, droneF, droneG, oscs = [], rainG, humG, noiseBuf, muted = false;
const build = () => {
  ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = muted ? 0 : .9; master.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  droneF = ctx.createBiquadFilter(); droneF.type = 'lowpass'; droneF.frequency.value = 300; droneG = ctx.createGain(); droneG.gain.value = 0; droneF.connect(droneG); droneG.connect(master);
  [55, 55.4, 82.5].forEach(f => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(droneF); o.start(); oscs.push(o); });
  const r = ctx.createBufferSource(); r.buffer = noiseBuf; r.loop = true; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; rainG = ctx.createGain(); rainG.gain.value = 0; r.connect(bp); bp.connect(rainG); rainG.connect(master); r.start();
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; humG = ctx.createGain(); humG.gain.value = 0; lp.connect(humG); humG.connect(master);
  [196, 294, 392, 587].forEach(f => { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f; o.connect(lp); o.start(); });
};
export const start = () => { if (!ctx) build(); ctx.resume(); };
export function mood({ drone = 0, pitch = 55, rain = 0, cut = 300, hum = 0 }) {
  if (!ctx) return; const t = ctx.currentTime;
  droneG.gain.setTargetAtTime(drone, t, 1.2); oscs[0].frequency.setTargetAtTime(pitch, t, 1); oscs[1].frequency.setTargetAtTime(pitch * 1.007, t, 1); oscs[2].frequency.setTargetAtTime(pitch * 1.5, t, 1);
  droneF.frequency.setTargetAtTime(cut, t, 1); rainG.gain.setTargetAtTime(rain, t, 1.5); humG.gain.setTargetAtTime(hum, t, 1.5);
}
export const swell = v => { if (ctx) droneG.gain.setTargetAtTime(.04 + v * .14, ctx.currentTime, .3); };
export const hum = v => { if (ctx) humG.gain.setTargetAtTime(v, ctx.currentTime, 1); };
function tone(f, d, v, type = 'sine', when = 0, f2 = f) {
  if (!ctx) return; const t = ctx.currentTime + when, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + d);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g); g.connect(master); o.start(t); o.stop(t + d + .05);
}
function hit(d, v, f, q) {
  if (!ctx) return; const t = ctx.currentTime, s = ctx.createBufferSource(), b = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); s.connect(b); b.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + d + .02);
}
export const bell = (major, v = 1) => (major ? [261.6, 329.6, 392] : [196, 185, 165]).forEach((f, i) => [1, 2.76, 5.4].forEach((m, k) => tone(f * m, 3.4 / (k + 1), .09 * v / (k + 1), 'sine', i * .9)));
export const nib = () => hit(.05, .05, 4200, 1.5);
export const tick = () => hit(.03, .07, 1800, 2);
export const coin = (p = 0) => tone(1500 + p * 350, .3, .05);
export const step = () => tone(70, .16, .13, 'triangle', 0, 40);
export const stamp = () => { tone(90, .22, .25, 'triangle', 0, 40); hit(.08, .1, 600, 1); };
export const chisel = () => { hit(.04, .09, 3000, 3); tone(1800, .08, .02); };
export const wing = () => hit(.18, .09, 1200, .8);
export const mute = b => { muted = b; if (master) master.gain.value = b ? 0 : .9; };
