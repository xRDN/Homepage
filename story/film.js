import { SCENES } from './scenes.js';
import * as A from './audio.js';
import { W, H, clamp, finish } from './paint.js';

const $ = id => document.getElementById(id);
const cv = $('c'), ctx = cv.getContext('2d'), inp = $('inp'), capEl = $('cap'), skipBtn = $('skip'), bar = $('bar');
const total = SCENES.reduce((a, s) => a + s.dur, 0), fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
// Film state. Scenes read S (time, pointer, whether a witness moment is waiting) and write S.witness (what the viewer gave the film).
const S = { i: -1, t: 0, clock: 0, dt: 0, holdTime: 0, resolved: true, holding: false, paused: false, started: false, interact: true, captions: true,
  ink: 0, inkTo: 0, ptr: { x: W / 2, y: H / 2, down: false }, keyDown: false, userTapped: false, wantInput: false, witness: { sentence: '', words: '', ticks: 0 }, inp };
let sc = null, st = null, last = performance.now(), lastMove = last;

S.resolve = auto => {
  if (S.resolved) return; if (auto === true && sc.auto) sc.auto(S, st);
  S.resolved = true; S.holding = false; S.wantInput = false; inp.blur();
};
function go(i) {
  i = clamp(i, 0, SCENES.length - 1); S.i = i; sc = SCENES[i]; S.t = 0; S.clock = 0; S.holdTime = 0; S.resolved = !sc.hold; S.holding = false; S.wantInput = false; S.userTapped = false; inp.value = '';
  st = sc.init ? sc.init(S) : {}; A.mood(sc.mood || {}); S.inkTo = sc.ink ?? S.ink;
}
function end() { S.paused = true; $('endline').textContent = S.witness.words ? `Your words were carved: ${S.witness.words}` : 'Keep the reading.'; $('end').hidden = false; }
function fit() { const dpr = Math.min(window.devicePixelRatio || 1, 1.5), w = cv.clientWidth || 1600; cv.width = Math.round(w * dpr); cv.height = Math.round(w * dpr * H / W); }

function draw() {
  const k = cv.width / W; ctx.setTransform(k, 0, 0, k, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (!sc) return;
  sc.paint(ctx, S, S.t, st); finish(ctx, { vig: sc.vig ?? .45, ink: S.ink, t: S.clock });
  let a = 0; if (S.t < .8) a = 1 - S.t / .8; if (sc.dur - S.t < .8) a = Math.max(a, 1 - (sc.dur - S.t) / .8);
  if (a > 0) { ctx.fillStyle = `rgba(0,0,0,${clamp(a, 0, 1)})`; ctx.fillRect(0, 0, W, H); }
}
const segs = SCENES.map((s, i) => { const b = document.createElement('button'); b.className = 'seg'; b.style.flex = s.dur; b.title = `${s.part}: ${s.title}`; b.setAttribute('aria-label', s.title); b.onclick = () => S.started && go(i); $('chap').appendChild(b); return b; });
function ui(now) {
  let elapsed = 0; segs.forEach((b, i) => { b.classList.toggle('cur', i === S.i); b.style.setProperty('--p', i < S.i ? 1 : i === S.i ? S.t / sc.dur : 0); if (i < S.i) elapsed += SCENES[i].dur; });
  if (sc) {
    elapsed += S.t; $('time').textContent = `${fmt(elapsed)} / ${fmt(total)}`;
    const c = S.holding && sc.holdCap ? sc.holdCap : (sc.caps || []).find(c => S.t >= c[0] && S.t < c[1]);
    const text = S.captions ? (typeof c === 'string' ? c : c && c[2]) : ''; capEl.textContent = text || ''; capEl.style.opacity = text ? 1 : 0;
  }
  skipBtn.style.display = S.holding && S.holdTime > 8 ? 'block' : 'none';
  if (S.wantInput && document.activeElement !== inp) inp.focus({ preventScroll: true });
  bar.classList.toggle('hide', S.started && !S.paused && now - lastMove > 3200);
}
function tick(now) {
  const dt = Math.min((now - last) / 1000, .1); last = now; S.dt = S.paused ? 0 : dt;
  if (S.started && !S.paused && sc) {
    S.clock += dt;
    if (sc.hold && !S.resolved && S.t >= sc.hold.at) { S.t = sc.hold.at; S.holding = true; S.holdTime += dt; if (sc.typing) S.wantInput = true; if (!S.interact) S.resolve(true); }
    else { S.holding = false; S.t += dt; }
    if (S.t >= sc.dur) { if (S.i + 1 < SCENES.length) go(S.i + 1); else { S.t = sc.dur; end(); } }
  }
  S.ink += (S.inkTo - S.ink) * Math.min(1, dt * .8);
  draw(); ui(now); requestAnimationFrame(tick);
}

const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
cv.addEventListener('pointerdown', e => { lastMove = performance.now(); if (!sc) return; const [x, y] = pos(e); S.ptr.x = x; S.ptr.y = y; S.ptr.down = true; if (S.wantInput) inp.focus(); sc.onDown && sc.onDown(S, st, x, y); });
cv.addEventListener('pointermove', e => { lastMove = performance.now(); const [x, y] = pos(e); S.ptr.x = x; S.ptr.y = y; sc && sc.onMove && sc.onMove(S, st, x, y); });
addEventListener('pointerup', () => { if (!S.ptr.down) return; S.ptr.down = false; sc && sc.onUp && sc.onUp(S, st, S.ptr.x, S.ptr.y); });
addEventListener('keydown', e => {
  lastMove = performance.now(); if (!S.started || document.activeElement === inp) return;
  if (sc && sc.onKey && sc.onKey(e, S, st)) { e.preventDefault(); return; }
  if (e.code === 'Space' || e.code === 'Enter') { S.keyDown = true; e.preventDefault(); }
  else if (e.code === 'ArrowRight') go(S.i + 1); else if (e.code === 'ArrowLeft') go(S.i - 1);
  else if (e.key === 'k') $('pp').click(); else if (e.key === 'c') $('cc').click(); else if (e.key === 'm') $('mu').click(); else if (e.key === 'f') $('fs').click();
});
addEventListener('keyup', e => { if (e.code === 'Space' || e.code === 'Enter') S.keyDown = false; });
addEventListener('mousemove', () => { lastMove = performance.now(); });
inp.addEventListener('input', () => sc && sc.onInput && sc.onInput(inp.value, S, st));
inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); sc && sc.onSubmit && sc.onSubmit(inp.value, S, st); } if (e.key === 'Escape') inp.blur(); });
skipBtn.onclick = () => S.resolve(true);
$('watch').onclick = () => { A.start(); S.interact = !$('noint').checked; $('it').setAttribute('aria-pressed', S.interact); $('title').hidden = true; S.started = true; go(0); };
$('again').onclick = () => { $('end').hidden = true; S.paused = false; S.ink = 0; go(0); };
$('pp').onclick = e => { S.paused = !S.paused; e.currentTarget.textContent = S.paused ? '▶' : '❚❚'; };
$('cc').onclick = e => { S.captions = !S.captions; e.currentTarget.setAttribute('aria-pressed', S.captions); };
$('it').onclick = e => { S.interact = !S.interact; e.currentTarget.setAttribute('aria-pressed', S.interact); if (!S.interact && S.holding) S.resolve(true); };
$('mu').onclick = e => { const m = e.currentTarget.getAttribute('aria-pressed') !== 'true'; A.mute(m); e.currentTarget.setAttribute('aria-pressed', m); e.currentTarget.textContent = m ? 'Muted' : 'Sound'; };
$('fs').onclick = () => { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); };
addEventListener('resize', fit); fit(); requestAnimationFrame(tick);
