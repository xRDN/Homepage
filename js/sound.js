// Procedural ambience: nothing to download, everything is synthesized live.
let ctx, master, windG, rainG, on = true, mood = { night: false, cold: false, wx: 'clear' };
const noise = brown => {
  const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0);
  let l = 0;
  for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; l = brown ? (l + .02 * w) / 1.02 : w; d[i] = brown ? l * 3.5 : w; }
  const s = ctx.createBufferSource(); s.buffer = b; s.loop = true; s.start(); return s;
};
function blip(f, d = .08, v = .05, f2 = f, type = 'sine', when = 0) {
  if (!ctx || !on) return;
  const t = ctx.currentTime + when, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f2, t + d);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + d * .2); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  o.connect(g).connect(master); o.start(t); o.stop(t + d + .02);
}
export const sound = {
  start() {
    if (ctx) return ctx.resume();
    ctx = new AudioContext(); master = ctx.createGain(); master.gain.value = on ? .5 : 0; master.connect(ctx.destination);
    const lp = ctx.createBiquadFilter(); lp.frequency.value = 450;
    windG = ctx.createGain(); noise(true).connect(lp).connect(windG).connect(master);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800;
    rainG = ctx.createGain(); rainG.gain.value = 0; noise(false).connect(hp).connect(rainG).connect(master);
    sound.set(mood.night, mood.cold, mood.wx);
    setInterval(() => {
      const { night, cold, wx } = mood;
      if (cold || wx === 'rain') return;
      if (night) for (let i = 0; i < 3; i++) blip(4300, .035, .012, 4300, 'sine', i * .07);          // crickets
      else if (Math.random() < .25) { blip(2400, .12, .03, 3400); blip(3200, .1, .025, 2600, 'sine', .15); } // birds
    }, 500);
  },
  set(night, cold, wx) {
    mood = { night, cold, wx };
    if (!ctx) return;
    windG.gain.setTargetAtTime(.1 + (cold ? .1 : 0) + (wx === 'rain' ? .04 : 0), ctx.currentTime, 1.5);
    rainG.gain.setTargetAtTime(wx === 'rain' ? .22 : 0, ctx.currentTime, 1.5);
  },
  step: soft => blip(soft ? 220 : 150, .05, soft ? .02 : .05, 60, 'triangle'),
  jump: () => blip(300, .15, .05, 650),
  chime: () => { blip(784, .5, .07); blip(1047, .6, .06, 1047, 'sine', .12); },
  toggle() { on = !on; if (master) master.gain.value = on ? .5 : 0; return on; },
};
