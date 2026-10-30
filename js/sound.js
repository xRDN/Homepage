// Procedural ambience: nothing to download, everything is synthesized live.
// sound.set(night, cold, wx) picks the music scale and the critters; sound.env({...}) follows the blended weather numbers.
let ctx, master, amb, windG, windF, rainG, snowG, horG, droneF, hv = 0, on = true, mood = { night: false, cold: false, wx: 'clear' }, envv = { rain: 0, snow: 0, wind: .15, shelter: 0, heat: 0 };
const noise = (brown, sec = 2, loop = true) => {
  const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate), d = b.getChannelData(0);
  let l = 0;
  for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; l = brown ? (l + .02 * w) / 1.02 : w; d[i] = brown ? l * 3.5 : w; }
  const s = ctx.createBufferSource(); s.buffer = b; s.loop = loop; s.start(); return s;
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
    // weather bed goes through its own low-pass so shelters can muffle it without dulling the music
    amb = ctx.createBiquadFilter(); amb.frequency.value = 18000; amb.connect(master);
    const lp = ctx.createBiquadFilter(); lp.frequency.value = 450;
    windG = ctx.createGain(); noise(true).connect(lp).connect(windG).connect(amb);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800;
    rainG = ctx.createGain(); rainG.gain.value = 0; noise(false).connect(hp).connect(rainG).connect(amb);
    const sf = ctx.createBiquadFilter(); sf.type = 'bandpass'; sf.frequency.value = 2600; sf.Q.value = .4;
    snowG = ctx.createGain(); snowG.gain.value = 0; noise(false).connect(sf).connect(snowG).connect(amb);
    // haunted-island drone: three detuned low saws through a slowly wandering low-pass (silent until horror mode is on)
    horG = ctx.createGain(); horG.gain.value = 0; droneF = ctx.createBiquadFilter(); droneF.type = 'lowpass'; droneF.frequency.value = 160; droneF.connect(horG).connect(master);
    for (const f of [48.9, 51.3, 97.4]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; const g = ctx.createGain(); g.gain.value = f > 90 ? .35 : 1; o.connect(g).connect(droneF); o.start(); }
    setInterval(() => droneF.frequency.setTargetAtTime(110 + Math.random() * 170, ctx.currentTime, 2.5), 3500);
    sound.set(mood.night, mood.cold, mood.wx);
    const SC = { dw: [262, 294, 330, 392, 440, 523], dc: [392, 440, 523, 587, 659, 784], nw: [196, 233, 262, 311, 349, 392], nc: [523, 622, 698, 784, 932, 1047] };
    setInterval(() => { // generative pentatonic, scale follows the world mood; stormy weather thins it out
      if (Math.random() > .6 - envv.rain * .25) return;
      if (hv > .5) { const f = 70 + Math.random() * 90; blip(f, 3, .02 * hv, f * (Math.random() < .5 ? 1 : 1.06), 'triangle'); return; } // haunted: low, slightly off-key
      const sc = SC[(mood.night ? 'n' : 'd') + (mood.cold ? 'c' : 'w')], f = sc[Math.floor(Math.random() * sc.length)];
      blip(f, 1.6, .025 * (1 - envv.rain * .5)); if (Math.random() < .4) blip(f * 1.5, 1.2, .012, f * 1.5, 'sine', .25);
    }, 1700);
    setInterval(() => { // critters: only when the weather lets them out
      const { night, cold, wx } = mood;
      if (hv > .3) return; // no birds, no crickets: it is too quiet
      if (cold || envv.rain > .15 || envv.wind > .7 || wx === 'fog') return;
      if (envv.heat > .5 && !night) { if (Math.random() < .5) for (let i = 0; i < 7; i++) blip(5200, .03, .008, 5200, 'sine', i * .035); } // cicadas
      else if (night) for (let i = 0; i < 3; i++) blip(4300, .035, .012, 4300, 'sine', i * .07);             // crickets
      else if (Math.random() < .25) { blip(2400, .12, .03, 3400); blip(3200, .1, .025, 2600, 'sine', .15); } // birds
    }, 500);
  },
  set(night, cold, wx) { mood = { night, cold, wx }; },
  env(e) {
    Object.assign(envv, e);
    if (!ctx) return;
    const T = ctx.currentTime, k = 1 - envv.shelter * .62;
    windG.gain.setTargetAtTime(.07 + envv.wind * .22 + (mood.cold ? .05 : 0), T, .8);
    rainG.gain.setTargetAtTime(envv.rain * .26 * k, T, .8);
    snowG.gain.setTargetAtTime(envv.snow * .03 * k, T, .8);
    amb.frequency.setTargetAtTime(envv.shelter > .5 ? 900 : 18000, T, .25);
  },
  thunder(power = 1) { // low rumble: noise burst through a falling low-pass
    if (!ctx || !on) return;
    const T = ctx.currentTime, s = noise(true, 3, false), g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.frequency.setValueAtTime(420, T); f.frequency.exponentialRampToValueAtTime(70, T + 2.6);
    g.gain.setValueAtTime(0, T); g.gain.linearRampToValueAtTime(.9 * power * (1 - envv.shelter * .35), T + .08); g.gain.exponentialRampToValueAtTime(.001, T + 2.8);
    s.connect(f).connect(g).connect(master); s.stop(T + 3);
  },
  horror(v) { hv = v; if (horG) horG.gain.setTargetAtTime(v * .06, ctx.currentTime, 1.2); },
  creak() { blip(120, 1.2, .05, 62, 'sawtooth'); blip(2300, .06, .008, 1700, 'square', .05); },
  heartbeat(p = .5) { blip(62, .13, .07 + p * .1, 38, 'sine'); blip(54, .15, .05 + p * .08, 34, 'sine', .2); },
  meow(happy) { blip(happy ? 520 : 600, .32, .045, happy ? 700 : 820, 'triangle'); blip(happy ? 700 : 820, .25, .035, happy ? 480 : 560, 'triangle', .22); },
  quack() { blip(420, .12, .05, 300, 'square'); blip(390, .12, .045, 280, 'square', .16); },
  splash: () => blip(260, .25, .05, 70, 'triangle'),
  step: (soft, wet) => wet ? blip(520, .07, .03, 190, 'triangle') : blip(soft ? 220 : 150, .05, soft ? .02 : .05, 60, 'triangle'),
  jump: () => blip(300, .15, .05, 650),
  chime: () => { blip(784, .5, .07); blip(1047, .6, .06, 1047, 'sine', .12); },
  pop: () => blip(520, .09, .04, 760, 'sine'),
  toggle() { on = !on; if (master) master.gain.value = on ? .5 : 0; return on; },
};
