import * as P from './paint.js';
import * as A from './audio.js';
const { W, H, clamp, lerp, ease, rnd, mixc, grad, rect, disc, glow, shaft, person, crowd, house, tower, dust, ghostHand, HAND } = P;

const lev = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
export const hasWord = (text, word) => text.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).some(w => w && (w.startsWith(word.slice(0, 6)) || lev(w, word) <= 3));
const inkText = (ctx, s, x, y, size, a = 1, col = '#1a1510') => { ctx.save(); ctx.globalAlpha = a; ctx.font = `${size}px ${HAND}`; ctx.fillStyle = col; ctx.shadowColor = 'rgba(20,15,10,.55)'; ctx.shadowBlur = 2; ctx.fillText(s, x, y); ctx.restore(); };

// The shared Ashmarket square, used in the film's opening, noon, the light spreading, the seasons and the last Tuesday.
function square(ctx, t, o = {}) {
  const k = o.warm ?? 0, mx = (a, b) => mixc(a, b, k);
  grad(ctx, 0, 400, o.sky0 || mx('#5d6166', '#79b8e4'), o.sky1 || mx('#a29d95', '#f3e6c8'));
  P.hills(ctx, 300, 22, mx('#6f7176', '#9bc08a'), 3, t * 2);
  [60, 215, 370, 1170, 1325, 1490].forEach((x, i) => house(ctx, x, 390, 120 + (i % 3) * 14, 130 + (i % 2) * 24, mx('#8b8780', '#e3cfa8'), mx('#4d4e52', '#b5523b'), o.lit ?? k * .6));
  tower(ctx, 800, 420, 1, mx('#85817b', '#cdb48c'), mx('#4a4a50', '#8b4a3a'));
  rect(ctx, 0, 420, W, H - 420, mx('#7d7b76', '#cdbf9f'));
  [0, 1, 2].forEach(i => rect(ctx, 800 - 190 - i * 36, 440 + i * 24, 380 + i * 72, 24, mx('#6c6a66', '#b9ab8c')));
  if (o.shaft) shaft(ctx, 1000, 210 + o.shaft * 220, o.shaft * .5);
  if (o.crowd) crowd(ctx, o.crowd, 300, 1300, 560, 1.15, mx('#25272b', '#5a4254'), 7, t, o.lit2 || 0);
}
const text = (ctx, s, x, y, size, col, a = 1, font = 'Georgia') => { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = col; ctx.font = `700 ${size}px ${font}`; ctx.fillText(s, x, y); ctx.restore(); };

// ---------------------------------------------------------------- Prologue
const prologue = {
  id: 'tide', title: 'The Tide Wall', part: 'Prologue', dur: 75, hold: { at: 42 }, vig: .5, ink: 0, mood: { drone: .05, pitch: 46, cut: 240 },
  caps: [[1, 9, '[wind, a chisel tapping stone]'], [10, 24, 'Every grey season is cut into the harbour wall.'], [26, 40, 'The next one is not cut yet.'], [53, 62, '[three notes of a bell]'], [67, 75, 'KEEP THE READING']],
  holdCap: '[wipe the glass]',
  init() { const f = document.createElement('canvas'); f.width = W; f.height = H; const c = f.getContext('2d'); c.fillStyle = 'rgba(205,210,214,.97)'; c.fillRect(0, 0, W, H); return { fog: f, c, cells: new Set(), fogA: 1, tap: 0, rang: false }; },
  paint(ctx, S, t, st) {
    if (t < 26) {
      grad(ctx, 0, H * .6, '#2b2f3d', '#c78d68'); grad(ctx, H * .6, H, '#3d4a56', '#1c242c');
      const off = -t * 60; rect(ctx, 0, 300, W, 240, '#8a8478'); ctx.strokeStyle = 'rgba(40,36,30,.35)'; ctx.lineWidth = 2;
      for (let y = 300; y < 540; y += 48) for (let x = ((off % 120) + 120) % 120 - 120; x < W; x += 120) ctx.strokeRect(x + ((y - 300) / 48 % 2) * 60, y, 120, 48);
      [[500, '214'], [1150, '397'], [1800, '611'], [2500, '']].forEach(([mx, yr], k) => {
        const x = mx + off; if (x < -120 || x > W + 120) return; const last = !yr;
        rect(ctx, x - 14, 300, 28, last ? 44 : 150 - k * 22, last ? 'rgba(18,16,14,.92)' : 'rgba(70,74,80,.6)'); if (yr) text(ctx, yr, x - 26, 490, 28, '#2a2620');
      });
      if (t > 14 && Math.floor(t * 2.5) !== st.tap) { st.tap = Math.floor(t * 2.5); A.chisel(); }
    } else if (t < 42) {
      const g = clamp((t - 26) / 16, 0, 1);
      grad(ctx, 0, H * .55, '#232a3a', '#d09a74'); grad(ctx, H * .55, H, '#3a4854', '#1a2128');
      ctx.fillStyle = `rgba(86,90,96,${.2 + g * .7})`; ctx.fillRect(0, H * .55 - g * 46, W, g * 46 + (H * .45) * g * .65);
      for (let i = 0; i < 40; i++) rect(ctx, (i * 97 + t * 14) % W, H * .56 + (i * 31) % 240, 60, 1, 'rgba(255,255,255,.07)');
    } else {
      rect(ctx, 0, 0, W, H, '#17191e');
      ctx.save(); ctx.beginPath(); ctx.moveTo(380, 620); ctx.lineTo(380, 220); ctx.quadraticCurveTo(380, 40, 800, 40); ctx.quadraticCurveTo(1220, 40, 1220, 220); ctx.lineTo(1220, 620); ctx.closePath(); ctx.clip();
      grad(ctx, 0, 480, '#4a4f58', '#8d8a86'); rect(ctx, 380, 470, 840, 160, '#6e6c68'); rect(ctx, 740, 120, 120, 350, '#78746f'); rect(ctx, 770, 200, 60, 70, '#2a2a2e');
      for (let i = 0; i < 4; i++) rect(ctx, 620 - i * 10, 440 + i * 0, 360 + i * 20, 12, '#5d5b58');
      ctx.fillStyle = `rgba(88,92,98,${.5 + Math.sin(S.clock) * .05})`; ctx.fillRect(380, 540, 840, 90);
      person(ctx, 800, 470, 1.2, '#15171b', { arm: [0, -26] });
      if (t > 52 && !st.rang) { st.rang = true; A.bell(false, .8); }
      if (S.resolved) st.fogA = Math.max(0, st.fogA - S.dt * .5);
      ctx.globalAlpha = st.fogA; ctx.drawImage(st.fog, 0, 0); ctx.globalAlpha = 1;
      if (!S.resolved && S.holdTime > 2.5 && st.cells.size < 25) text(ctx, 'wipe the glass', 640, 340, 40, 'rgba(70,80,90,.5)', 1, HAND);
      ctx.restore(); ctx.strokeStyle = '#0c0d10'; ctx.lineWidth = 26; ctx.stroke();
      if (t > 64) { rect(ctx, 0, 0, W, H, `rgba(0,0,0,${ease((t - 64) / 3)})`); if (t > 67) text(ctx, 'KEEP THE READING', 520, 350, 54, '#cfc6b2', ease((t - 67) / 3), 'Georgia'); }
    }
  },
  onDown(S, st, x, y) { this.onMove(S, st, x, y); },
  onMove(S, st, x, y) {
    if (!S.holding || !S.ptr.down || !st.c) return;
    st.c.globalCompositeOperation = 'destination-out'; st.c.beginPath(); st.c.arc(x, y, 50, 0, 6.2832); st.c.fill();
    if (x > 380 && x < 1220 && y > 60 && y < 620) st.cells.add((x / 40 | 0) + ':' + (y / 40 | 0));
    if (Math.random() < .06) A.tick(); if (st.cells.size > 120) S.resolve();
  },
};

// ---------------------------------------------------------------- Part I: down
const silence = {
  id: 'silence', title: 'The Silence', part: 'I · Down', dur: 45, vig: .55, ink: .05, mood: { drone: .06, pitch: 52, cut: 280 },
  caps: [[2, 9, '[a flat bell, rung by no one]'], [12, 30, 'People still come at noon.'], [32, 44, 'Nobody reads.']],
  init: () => ({}),
  paint(ctx, S, t, st) { square(ctx, t, { warm: 0, shaft: .12, crowd: Math.round(38 * (1 - ease((t - 18) / 22))) }); dust(ctx, S.clock, 40, 3, .3); if (t > 2 && !st.b) { st.b = 1; A.bell(false, .9); } },
};
const office = {
  id: 'office', title: 'The Office', part: 'I · Down', dur: 55, hold: { at: 18 }, vig: .5, ink: .12, mood: { drone: .06, pitch: 52, cut: 330 },
  caps: [[1, 9, '[nibs scratching, a slow clock]'], [10, 17, 'Yesterday’s page.'], [28, 44, '[her hand copies the number]']],
  holdCap: '',
  init: () => ({ page: 0, flip: 1, stage: 'pages', tries: 0, val: '', shake: 0, sunk: 0, n: 0 }),
  auto(S) { S.witness.sentence = S.witness.sentence || 'corruption'; },
  turn(S, st) { if (st.stage !== 'pages') return; A.nib(); st.page++; st.flip = 0; if (st.page >= 3) { st.stage = 'type'; S.wantInput = true; } },
  paint(ctx, S, t, st) {
    grad(ctx, 0, H, '#39424e', '#1d232b');
    for (let i = 0; i < 6; i++) { rect(ctx, 110 + i * 260, 50, 120, 290, 'rgba(170,190,215,.28)'); shaft(ctx, 120 + i * 260, 90, .06, '200,215,235'); }
    rect(ctx, 0, 470, W, 200, '#171b21');
    for (let i = 0; i < 6; i++) { const x = 170 + i * 260; rect(ctx, x - 90, 440, 180, 16, '#2a2f37'); person(ctx, x, 470, 1.5, '#0f1216', { arm: [30, 8 + Math.sin(S.clock * 7 + i) * 4] }); }
    if (t < 12 && Math.floor(S.clock * 3) !== st.n) { st.n = Math.floor(S.clock * 3); A.nib(); }
    const z = ease((t - 9) / 6); if (z <= 0) return;
    ctx.save(); ctx.globalAlpha = z; rect(ctx, 0, 0, W, H, '#1a1712'); st.flip = Math.min(1, st.flip + S.dt * 2.2);
    ctx.translate((1 - st.flip) * 160, 0); ctx.globalAlpha = z * st.flip;
    rect(ctx, 430, 36, 740, 600, '#e6d9bb'); ctx.fillStyle = 'rgba(120,100,70,.35)'; for (let r = 0; r < 12; r++) ctx.fillRect(470, 100 + r * 44, 660, 1);
    const rr = rnd(7 + st.page * 3); ctx.font = '600 28px "Courier New", monospace'; ctx.fillStyle = '#3a3226';
    for (let r = 0; r < 10; r++) for (let c = 0; c < 4; c++) ctx.fillText(String(Math.floor(rr() * 90 + 10)), 480 + c * 160, 130 + r * 44);
    const ax = 480 + (1 + st.page) * 160 % 640, ay = 130 + (3 + st.page * 2) * 44; glow(ctx, ax + 12, ay - 10, 60, '150,40,30', .35); ctx.font = '700 46px "Courier New", monospace'; ctx.fillStyle = 'rgba(120,36,28,.95)'; ctx.fillText('9', ax, ay);
    if (st.stage === 'type' || S.resolved) {
      rect(ctx, 460, 80, 700, 330, '#e6d9bb'); const fade = S.resolved ? 1 - st.sunk : 1;
      inkText(ctx, 'Do you notice what happened?', 480, 150, 38, fade);
      inkText(ctx, 'Yes, it is ‘corruption’.', 480 + Math.sin(S.clock * 60) * st.shake * 3, 215, 38, (.32 + st.shake * .5) * fade, '#4a463e');
      inkText(ctx, st.val.slice(-40), 480, 310, 44, fade);
      if (st.val && !S.resolved) rect(ctx, 480 + Math.min(st.val.length, 40) * 19, 280, 3, 40, `rgba(26,21,16,${Math.sin(S.clock * 6) > 0 ? .8 : 0})`);
    }
    ctx.restore(); st.shake = Math.max(0, st.shake - S.dt * 1.4); if (S.resolved) st.sunk = Math.min(1, st.sunk + S.dt / 6);
    const tr = Math.sin(S.clock * 40) * 1.4; disc(ctx, 820 + tr, 540, 26, `rgba(201,165,138,${z})`); ctx.strokeStyle = '#222'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(820 + tr, 540); ctx.lineTo(764 + tr, 580); ctx.stroke();
  },
  onDown(S, st, x, y) { if (!S.holding) return; if (st.stage === 'pages') this.turn(S, st); else if (y > 165 && y < 235 && x > 460 && x < 1160) { S.inp.value = 'corruption'; this.onInput('corruption', S, st); this.onSubmit('corruption', S, st); } },
  onKey(e, S, st) { if (S.holding && st.stage === 'pages') { this.turn(S, st); return true; } return false; },
  onInput(v, S, st) { st.val = v; A.nib(); },
  onSubmit(v, S, st) {
    if (st.stage !== 'type' || !v.trim()) return; st.val = v;
    if (hasWord(v, 'corruption') || ++st.tries >= 2) { S.witness.sentence = v.trim(); S.resolve(); } else st.shake = 1;
  },
};
const tolls = {
  id: 'tolls', title: 'Three Tolls', part: 'I · Down', dur: 45, vig: .5, ink: .17, mood: { drone: .06, pitch: 50, cut: 300 },
  caps: [[2, 10, '[water, footsteps on stone]'], [14, 34, 'Three tolls to cross one bridge.'], [36, 44, 'She does not argue. She counts.']],
  init: () => ({ p: [0, 0, 0] }),
  paint(ctx, S, t, st) {
    grad(ctx, 0, H, '#4a5258', '#2d353b'); for (let i = 0; i < 16; i++) { ctx.strokeStyle = 'rgba(180,200,210,.1)'; ctx.beginPath(); ctx.ellipse((i * 131 + S.clock * 12) % W, 80 + (i * 53) % 150, 90, 6, 0, 0, 6.2832); ctx.stroke(); }
    rect(ctx, 0, 250, W, 170, '#8d867a'); rect(ctx, 0, 244, W, 8, '#5c564d'); rect(ctx, 0, 418, W, 8, '#5c564d'); ctx.strokeStyle = 'rgba(60,54,46,.4)'; for (let x = 0; x < W; x += 70) { ctx.beginPath(); ctx.moveTo(x, 252); ctx.lineTo(x, 418); ctx.stroke(); }
    const X = lerp(120, 1480, clamp(t / 38, 0, 1)), tolls = [430, 800, 1170], n = tolls.filter(px => X > px).length;
    tolls.forEach((px, k) => { disc(ctx, px, 300, 26, '#1c1c20'); rect(ctx, px - 20, 298, 40, 8, '#1c1c20'); if (X > px && !st.p[k]) { st.p[k] = 1; A.coin(k); } });
    disc(ctx, X, 340, 24, '#c9a58a'); rect(ctx, X - 30, 332, 60, 6, '#5a4630'); ctx.fillStyle = '#e0b040'; ctx.beginPath(); ctx.ellipse(X, 326, 34 - n * 8, 18 - n * 4, 0, 0, 6.2832); ctx.fill();
    if (t > 34) { disc(ctx, 1500, 470 + Math.sin(t * 3) * 2, 22, '#7a2e2a'); }
    glow(ctx, X, 326, 60, '255,210,90', .12);
  },
};
const orr = {
  id: 'orr', title: 'Orr’s Table', part: 'I · Down', dur: 45, vig: .5, ink: .22, mood: { drone: .07, pitch: 51, cut: 320 },
  caps: [[2, 10, '[a spoon on an eggshell]'], [14, 26, 'He feeds the pigeons first.'], [30, 44, 'He does not hesitate.']],
  init: () => ({}),
  paint(ctx, S, t, st) {
    grad(ctx, 0, H, '#cfd2d4', '#9da2a6'); rect(ctx, 1000, 60, 320, 380, '#aebdc8'); rect(ctx, 1000, 60, 320, 380, 'rgba(255,255,255,.2)'); ctx.strokeStyle = '#6c6f73'; ctx.lineWidth = 10; ctx.strokeRect(1000, 60, 320, 380); rect(ctx, 1155, 60, 10, 380, '#6c6f73');
    rect(ctx, 0, 440, W, 230, '#e9e9e6'); rect(ctx, 0, 436, W, 8, '#bfc0be'); disc(ctx, 560, 410, 22, '#f3efe6'); rect(ctx, 550, 410, 20, 30, '#d8d3c8');
    person(ctx, 300, 440, 3.2, '#3b3e44', { arm: [40, 20 + Math.sin(S.clock * 2) * 3], bob: Math.sin(S.clock) * 1 });
    const flap = t > 14 && t < 17 ? Math.sin(t * 40) * 14 : 0; [0, 1, 2].forEach(i => { ctx.fillStyle = '#5a5e64'; ctx.beginPath(); ctx.ellipse(1060 + i * 90, 400 - flap * (i % 2 ? 1 : -1), 24, 14, 0, 0, 6.2832); ctx.fill(); });
    if (t > 14 && !st.w) { st.w = 1; A.wing(); }
    rect(ctx, 760, 400, 360, 90, '#f6f3ea'); text(ctx, t < 26 ? '3' : '9', 900, 462, 54, t < 26 ? '#2a2a2e' : '#7a2420', 1, '"Courier New", monospace');
    if (t > 24 && t < 27) { ctx.strokeStyle = '#2a2a2e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(1010 - (t - 24) * 30, 480); ctx.lineTo(900, 440); ctx.stroke(); }
    if (t > 26 && !st.n) { st.n = 1; A.nib(); }
  },
};
const court = {
  id: 'court', title: 'The Court', part: 'I · Down', dur: 55, vig: .6, ink: .27, mood: { drone: .09, pitch: 49, cut: 340 },
  caps: [[2, 10, '[a long echo]'], [20, 34, 'The scales move on their own.'], [42, 54, '[a stamp]']],
  init: () => ({}),
  paint(ctx, S, t, st) {
    grad(ctx, 0, H, '#707a86', '#2b3038'); [220, 520, 1080, 1380].forEach(x => { rect(ctx, x - 60, 40, 120, 360, 'rgba(210,225,240,.3)'); shaft(ctx, x - 40, 100, .08, '215,225,240'); });
    rect(ctx, 0, 520, W, 150, '#22262c'); const ang = (t < 20 ? 0 : Math.min(.25, (t - 20) * .03)) + Math.sin(S.clock * 1.3) * .015;
    ctx.save(); ctx.translate(800, 250); rect(ctx, -6, 0, 12, 260, '#3b3a36'); ctx.rotate(-ang); rect(ctx, -240, -6, 480, 12, '#3b3a36'); [-240, 240].forEach((x, i) => { ctx.strokeStyle = '#3b3a36'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 110); ctx.stroke(); disc(ctx, x, 120, 50, '#4a4842'); }); disc(ctx, 240, 100, 20, '#6a4a2a'); ctx.restore();
    person(ctx, 1230, 520, 2.4, '#14161a', { arm: [-30, 6] }); person(ctx, 330, 560, 2, '#5a2420'); if (t > 40) rect(ctx, 600, 560, 400, 70, 'rgba(120,30,28,.8)');
    if (t > 40 && !st.s) { st.s = 1; A.stamp(); }
  },
};
const hats = {
  id: 'hats', title: 'Forty Hats', part: 'I · Down', dur: 45, vig: .62, ink: .33, mood: { drone: .1, pitch: 48, cut: 360 },
  caps: [[3, 12, '[footsteps, paper]'], [16, 32, 'Forty hooks. Forty hats. Nobody.'], [34, 44, 'Forty.']],
  init: () => ({ last: 0 }),
  paint(ctx, S, t, st) {
    grad(ctx, 0, H, '#3a3d44', '#15161a'); rect(ctx, 0, 500, W, 170, '#101114'); const cam = -t * 22;
    for (let i = 0; i < 40; i++) { const x = 120 + (i % 20) * 150 + cam % 1, y = i < 20 ? 250 : 400, sw = i === 23 ? Math.sin(S.clock * 3) * 8 * clamp(1.4 - (t - 18) * .05, .2, 1) : 0; if (x < -60 || x > W + 60) continue; rect(ctx, x - 2, y - 34, 4, 34, '#6a6f78'); ctx.save(); ctx.translate(x, y); ctx.rotate(sw * .02); rect(ctx, -22, -2, 44, 6, '#222'); rect(ctx, -14, -26, 28, 26, '#25262c'); ctx.restore(); if (t / 45 * 40 > i) text(ctx, '', 0, 0, 1, '#000'); }
    shaft(ctx, 200 + Math.sin(t * .2) * 40, 220, .07); person(ctx, 640, 640, 2.8, '#6a2a26', { arm: [24, 10] });
    if (t > 20 && Math.floor(t * 1.2) !== st.last) { st.last = Math.floor(t * 1.2); A.step(); }
    if (t > 8 && t < 40) { const n = Math.min(40, Math.floor((t - 8) * 1.25)); text(ctx, String(n), 1440, 80, 44, 'rgba(230,225,210,.55)', 1, '"Courier New", monospace'); }
  },
};

// ---------------------------------------------------------------- Part II: the turn
const copy = {
  id: 'copy', title: 'Night Copy', part: 'II · Turn', dur: 60, hold: { at: 20 }, vig: .62, ink: .3, mood: { drone: .04, pitch: 44, cut: 200, rain: .05 },
  caps: [[1, 9, '[rain on glass, a nib]'], [10, 19, 'One candle.'], [38, 52, '[her mother moves the candle closer]']],
  holdCap: '[hold to shield the flame]',
  init: () => ({ flame: 1, gust: 0, next: 3, steps: 0 }),
  auto(S, st) { st.flame = 1; },
  paint(ctx, S, t, st) {
    if (S.holding) {
      const hold = S.ptr.down || S.keyDown; st.next -= S.dt; if (st.next < 0) { st.gust = 1; st.next = 4 + Math.random() * 3; }
      st.gust = Math.max(0, st.gust - S.dt * .7); st.flame += ((hold ? 1 : .32 + .2 * (1 - st.gust)) - st.flame) * Math.min(1, S.dt * 3);
      const ht = S.holdTime; if (ht > 5 && ht < 12 && Math.floor(ht * 1.6) !== st.steps) { st.steps = Math.floor(ht * 1.6); A.step(); } if (ht > 14) S.resolve();
    } else st.flame += (1 - st.flame) * Math.min(1, S.dt * 2);
    grad(ctx, 0, H, '#0e1119', '#04050a'); rect(ctx, 1080, 80, 340, 300, '#161a26'); for (let i = 0; i < 60; i++) rect(ctx, 1080 + (i * 37) % 340, 80 + ((i * 53 + S.clock * 260) % 300), 1, 14, 'rgba(160,180,210,.18)');
    rect(ctx, 0, 520, W, 150, '#0b0c12'); rect(ctx, 460, 460, 520, 24, '#2a2018'); person(ctx, 560, 460, 2.6, '#1c1f2c', { arm: [60, 16 + Math.sin(S.clock * 6) * 5] }); person(ctx, 1160, 540, 2.3, '#1b1e28', { arm: [-20, 24 + Math.sin(S.clock * 2) * 6], flip: true });
    rect(ctx, 640, 436, 160, 26, '#d9ccb0'); rect(ctx, 930, 400, 14, 60, '#cfc6b2');
    const fl = st.flame * (.9 + Math.sin(S.clock * 23) * .06 + Math.sin(S.clock * 9) * .04), R = 100 + 300 * fl;
    glow(ctx, 937, 392, R, '255,165,70', .5 * fl + .08); disc(ctx, 937, 388, 7 * fl + 1, 'rgba(255,225,150,.95)');
    const walk = S.holding && S.holdTime > 5 && S.holdTime < 12; rect(ctx, 130, 524, 120, 4, `rgba(255,200,120,${walk ? .35 + Math.sin(S.clock * 9) * .2 : .08})`);
    if (S.holding && !(S.ptr.down || S.keyDown) && S.holdTime > 2) text(ctx, 'hold', 905, 330, 30, 'rgba(255,220,170,.6)', 1, HAND);
    if (t > 40) { rect(ctx, 0, 0, W, H, 'rgba(0,0,0,0)'); }
  },
};
const archive = {
  id: 'archive', title: 'The Under-Archive', part: 'II · Turn', dur: 80, hold: { at: 25 }, vig: .55, ink: .3, mood: { drone: .05, pitch: 43, cut: 220, hum: 0 },
  caps: [[2, 10, '[dust, a candle]'], [12, 24, 'Old ledgers. Old margins.'], [50, 66, '[pencil ticks]'], [66, 79, 'She is not the first.']],
  holdCap: '',
  init: () => { const d = document.createElement('canvas'); d.width = W; d.height = H; return { dark: d, hands: [], ticks: [], next: 0, stage: 'light', stroke: null, mine: [], gather: 0, fin: 0, nt: 0 }; },
  auto(S, st) { S.witness.sentence = S.witness.sentence || 'corruption'; },
  paint(ctx, S, t, st) {
    grad(ctx, 0, H, '#2b2018', '#120c08'); for (let s = 0; s < 4; s++) { rect(ctx, 80 + s * 400, 40, 340, 440, '#3a2a1e'); for (let r = 0; r < 4; r++) for (let b = 0; b < 12; b++) rect(ctx, 96 + s * 400 + b * 27, 60 + r * 108 + (b % 3) * 6, 20, 88 - (b % 3) * 6, ['#6a3a2a', '#3a5260', '#7a6a2c', '#4a3a60'][(b + r + s) % 4]); }
    rect(ctx, 0, 500, W, 170, '#1a120c'); rect(ctx, 480, 440, 640, 190, '#e0d2b2'); rect(ctx, 556, 440, 3, 190, 'rgba(140,40,30,.6)'); ctx.fillStyle = 'rgba(120,100,70,.4)'; for (let r = 0; r < 6; r++) ctx.fillRect(570, 470 + r * 28, 520, 1);
    st.ticks.forEach(y => rect(ctx, 530, y, 22, 3, 'rgba(40,34,28,.8)')); st.mine.forEach(p => { rect(ctx, p[0] - 1, p[1] - 1, 3, 3, '#1a1510'); });
    if (st.mine.length > 3) inkText(ctx, S.witness.sentence || 'corruption', 590, 560, 34, ease(st.gather));
    const L = S.t >= 25 && S.interact ? S.ptr : { x: 800 + Math.sin(S.clock * .5) * 280, y: 300 + Math.cos(S.clock * .4) * 80 };
    if (S.holding) {
      if (S.holdTime > 12 && st.stage === 'light') st.stage = 'tick';
      st.next -= S.dt; if (st.next < 0 && st.stage !== 'done') { st.next = Math.max(.7, 2.8 - S.holdTime * .14); const a = Math.random() * 6.28; st.hands.push({ x: L.x + Math.cos(a) * (170 + Math.random() * 60), y: L.y + Math.sin(a) * (150 + Math.random() * 50), rot: a + 1.57, age: 0, life: 3.2, col: ['#e8dcc0', '#c9d3d8', '#d8c9e0', '#cfe0cf'][st.hands.length % 4], s: .9 + Math.random() * .5 }); A.tick(); }
      if (st.stage === 'tick') { glow(ctx, 520, 530, 120, '255,220,150', .3 + Math.sin(S.clock * 4) * .12); ctx.strokeStyle = 'rgba(40,34,28,.5)'; ctx.setLineDash([6, 8]); ctx.strokeRect(500, 460, 110, 150); ctx.setLineDash([]); }
    }
    st.hands = st.hands.filter(h => (h.age += S.dt) < h.life); st.hands.forEach(h => { const a = Math.sin(Math.PI * h.age / h.life) * .5; ghostHand(ctx, h.x, h.y, h.s, h.rot, a, h.col); if (h.age > h.life - S.dt * 2) st.ticks.push(470 + (st.ticks.length % 7) * 21); });
    if (st.stage === 'done') { st.gather = Math.min(1, st.gather + S.dt * .5); for (let i = 0; i < 8; i++) { const a = i * .785 + S.clock * .1, r = 320 * (1 - ease(st.gather)) + 40; ghostHand(ctx, 800 + Math.cos(a) * r, 540 + Math.sin(a) * r * .5, 1, a + 1.57, .5 * (1 - st.gather * .6), '#e8dcc0'); } if ((st.fin += S.dt) > 4 && !S.resolved) S.resolve(); }
    const d = st.dark.getContext('2d'); d.globalCompositeOperation = 'source-over'; d.fillStyle = 'rgba(4,3,2,.95)'; d.fillRect(0, 0, W, H); d.globalCompositeOperation = 'destination-out';
    const g = d.createRadialGradient(L.x, L.y, 0, L.x, L.y, 260); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.65, 'rgba(0,0,0,.65)'); g.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = g; d.fillRect(0, 0, W, H);
    ctx.drawImage(st.dark, 0, 0); glow(ctx, L.x, L.y, 280, '255,180,100', .22);
    if (S.resolved && t > 40) { P.shaft(ctx, 0, 0, 0); }
  },
  onDown(S, st, x, y) { if (S.holding && st.stage === 'tick' && x > 480 && x < 620 && y > 440 && y < 630) { st.stroke = [[x, y]]; } },
  onMove(S, st, x, y) { if (st.stroke && S.ptr.down) { const l = st.stroke[st.stroke.length - 1]; if (Math.hypot(x - l[0], y - l[1]) > 4) { st.stroke.push([x, y]); st.mine.push([x, y]); if (Math.random() < .3) A.nib(); } } },
  onUp(S, st) { if (st.stroke && st.stroke.length > 8) { st.stage = 'done'; S.witness.ticks++; A.hum(.07); S.witness.sentence = S.witness.sentence || 'corruption'; } st.stroke = null; },
};
const noon = {
  id: 'noon', title: 'The First Noon', part: 'II · Turn', dur: 55, hold: { at: 15 }, vig: .5, ink: .3, mood: { drone: .06, pitch: 50, cut: 300 },
  caps: [[2, 12, '[wind across the square]'], [34, 46, '‘Forty-one. Your bridge tax is forty-one coins a year, not a hundred and ten.’']],
  holdCap: '[hold the rope]',
  init: () => ({ rope: 0, struck: false, at: 0, men: 0 }),
  auto(S, st) { this.strike(S, st); },
  strike(S, st) { if (st.struck) return; st.struck = true; st.at = S.t; A.bell(true, 1.1); A.swell(0); S.resolve(); },
  paint(ctx, S, t, st) {
    if (S.holding && !st.struck) {
      const held = S.ptr.down || S.keyDown; st.rope = clamp(st.rope + S.dt * (held ? 1 / 3.2 : -1 / 8), 0, 1); st.men = st.rope; A.swell(st.rope);
      if (!held && st.rope > .35 || st.rope >= 1) this.strike(S, st);
    }
    const k = st.struck ? ease((t - st.at) / 5) : 0, warm = .12 + k * .6;
    square(ctx, t, { warm, shaft: k * .55, crowd: st.struck ? 0 : 0 });
    rect(ctx, 790, 100, 20, 8, '#222'); ctx.strokeStyle = '#6a5a3a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(800, 108); ctx.lineTo(800 + Math.sin(S.clock * 1.4) * 4, 250 + st.rope * 120); ctx.stroke(); disc(ctx, 800 + Math.sin(S.clock * 1.4) * 4, 252 + st.rope * 120, 8, '#8a5a2a');
    const n = Math.floor(st.men * 7); for (let i = 0; i < n; i++) person(ctx, i < 4 ? 140 + i * 90 : 1250 + (i - 4) * 90, 560 + (i % 2) * 20, 1.3, '#101114', { arm: [-6, -26] });
    person(ctx, 800, 440, 1.3, '#7a2e2a', { arm: [18, -12] }); person(ctx, 900, 470, 1.2, '#2a2a2e'); ctx.fillStyle = k > 0 ? '#e8b030' : '#6a6048'; ctx.beginPath(); ctx.ellipse(900, 440, 15, 9, 0, 0, 6.2832); ctx.fill();
    if (S.holding && S.holdTime > 3 && st.rope < .1) text(ctx, 'hold', 770, 400, 34, 'rgba(255,240,210,.7)', 1, HAND);
  },
};

// ---------------------------------------------------------------- Part III: up
const spreads = {
  id: 'spreads', title: 'The Light Spreads', part: 'III · Up', dur: 65, vig: .35, ink: 0, mood: { drone: .03, pitch: 55, cut: 700, hum: .04 },
  caps: [[3, 14, 'Three people. Then ten.'], [20, 36, 'Then a hundred, counting under their breath.'], [42, 58, '[the men stand with their arms folded, and do nothing]']],
  init: () => ({ lit: 0, last: -9 }),
  tap(S, st) { st.lit++; st.last = S.clock; S.userTapped = true; A.coin(st.lit % 3); },
  paint(ctx, S, t, st) {
    if (S.clock - st.last > (S.userTapped ? 3 : 1.4)) { st.last = S.clock; st.lit++; A.coin(st.lit % 3); }
    const warm = clamp(.3 + t / 65 * .45 + st.lit * .01, 0, .9);
    square(ctx, t, { warm, shaft: .2 + t / 65 * .4, crowd: Math.round(8 + t * 1.5), lit2: st.lit });
    text(ctx, String(40 + Math.min(1, t / 20)), 680, 392, 56, `rgba(255,244,214,${.5 + Math.sin(S.clock * 2) * .1})`);
    rect(ctx, 0, 626, W, 44, mixc('#12121a', '#4aa6c8', clamp(t / 40 + st.lit * .01, 0, 1)));
    for (let i = 0; i < 6; i++) person(ctx, 120 + i * 40, 560, 1.3, '#101114', { arm: [-6, -26] });
    dust(ctx, S.clock, 50, 9, .5, [300, 100, 1000, 400]);
  },
  onDown(S, st) { this.tap(S, st); }, onKey(e, S, st) { if (e.code === 'Space' || e.code === 'Enter') { this.tap(S, st); return true; } return false; },
};
const offer = {
  id: 'offer', title: 'The Offer', part: 'III · Up', dur: 45, vig: .5, ink: 0, mood: { drone: .05, pitch: 60, cut: 500, rain: .1 },
  caps: [[2, 12, '[a crowd, roaring]'], [30, 40, '[the roar falls away. A door.]']],
  init: () => ({}),
  paint(ctx, S, t, st) {
    grad(ctx, 0, H, '#c9a24a', '#5b3d1c'); crowd(ctx, 60, 0, W, 450, 1.8, 'rgba(40,24,10,.85)', 4, S.clock * 3); glow(ctx, 800, 300, 360, '255,210,110', .4);
    const push = ease((t - 22) / 8), keyX = lerp(900, 1060, push); rect(ctx, 1000 + push * 0, 280, 600, 70, '#d9b890'); ctx.strokeStyle = '#f0c040'; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(keyX, 300, 24, 0, 6.2832); ctx.moveTo(keyX - 24, 300); ctx.lineTo(keyX - 150, 300); ctx.moveTo(keyX - 120, 300); ctx.lineTo(keyX - 120, 330); ctx.stroke();
    const lx = lerp(-200, 560 + push * 160, ease((t - 14) / 8)); rect(ctx, lx - 300, 300, 400, 60, '#b88f72'); disc(ctx, lx + 100, 330, 38, '#b88f72'); glow(ctx, keyX, 300, 90, '255,230,140', .5);
    if (t > 22 && t < 23) A.coin(0); if (t > 30 && !st.d) { st.d = 1; A.mood({ drone: .02, pitch: 50, cut: 300, rain: 0 }); A.step(); }
  },
};
const handover = {
  id: 'handover', title: 'The Handover', part: 'III · Up', dur: 60, vig: .4, ink: 0, mood: { drone: .02, pitch: 52, cut: 600 },
  caps: [[4, 16, 'He sets down the seal.'], [18, 34, 'Three keepers. One key each.'], [40, 56, 'The queue does not look up.']],
  init: () => ({}),
  paint(ctx, S, t, st) {
    grad(ctx, 0, H, '#d8d3c6', '#b5ae9d'); rect(ctx, 0, 480, W, 190, '#9b937f'); rect(ctx, 420, 400, 760, 30, '#7a5a3a'); rect(ctx, 1320, 200, 200, 280, '#e8e4d6'); rect(ctx, 1320, 200, 200, 280, 'rgba(255,255,255,.3)');
    [0, 1, 2].forEach(i => { const taken = t > 16 + i * 4; const kx = taken ? 560 + i * 240 : 800 + i * 20, ky = taken ? 330 : 388; rect(ctx, kx - 18, ky, 36, 8, '#d8b030'); if (t > 16 + i * 4 && !st['k' + i]) { st['k' + i] = 1; A.coin(i); } person(ctx, 560 + i * 240, 480, 2.1, ['#2e4a5a', '#5a3a4a', '#4a5a38'][i]); });
    const ox = t < 36 ? 800 : lerp(800, 1420, ease((t - 36) / 10)); person(ctx, ox, 480, 2.3, '#3a3d44', { bob: Math.sin(S.clock * 2) * 1 }); if (t < 14) rect(ctx, 760, 380, 60, 20, '#b88a2a');
    if (t > 40) crowd(ctx, 7, 1000, 1500, 530, 1.1, '#34363c', 8, S.clock);
  },
};
const seasons = {
  id: 'seasons', title: 'Four Seasons', part: 'III · Up', dur: 80, vig: .4, ink: 0, mood: { drone: .02, pitch: 55, cut: 700, hum: .05 },
  caps: [[1, 18, 'Warm day.'], [21, 38, 'Cold day.'], [41, 58, 'Warm night.'], [61, 78, 'Cold night.']],
  init: () => ({ lit: new Set(), stamp: -1, cnt: [0, 0, 0, 0] }),
  lanterns: [[260, 380], [500, 330], [700, 300], [900, 300], [1100, 330], [1340, 380]],
  paint(ctx, S, t, st) {
    const s = Math.min(3, Math.floor(t / 20)), local = t - s * 20; if (!st.cnt[s]) { st.cnt[s] = 1; A.bell(s !== 3, .5); }
    const night = s >= 2; square(ctx, t, { warm: s === 0 ? .95 : s === 1 ? .5 : .55, sky0: night ? '#141a2e' : undefined, sky1: night ? '#3a3f58' : undefined, lit: night ? .9 : .5, crowd: s === 3 ? 4 : 22, shaft: night ? 0 : .25 });
    if (night) { rect(ctx, 0, 0, W, H, 'rgba(8,10,28,.35)'); }
    if (s === 1 || s === 3) for (let i = 0; i < 90; i++) rect(ctx, (i * 53 + S.clock * 20 * (1 + i % 3)) % W, (i * 71 + S.clock * 70) % H, 2, 2, 'rgba(240,244,250,.8)');
    if (s === 2) { this.lanterns.forEach(([x, y], i) => { if (!st.lit.has(i) && local > 3 + i * 2.2) st.lit.add(i); const on = st.lit.has(i); disc(ctx, x, y, 14, on ? '#ffd28a' : '#6a5a48'); if (on) glow(ctx, x, y, 130, '255,190,100', .55); }); }
    if (s === 3) {
      const ink = clamp(local / 12, 0, 1) * (st.stamp >= 0 ? 0 : 1); rect(ctx, 560, 120, 480, 300, '#e6d9bb'); ctx.strokeStyle = '#3a3226'; ctx.lineWidth = 2; ctx.strokeRect(560, 120, 480, 300); text(ctx, '9', 780, 300, 120, '#7a2420', 1, '"Courier New", monospace'); disc(ctx, 800, 280, 20 + ink * 120, `rgba(10,10,16,${.5 * ink})`);
      if (st.stamp < 0 && local > 14) st.stamp = S.clock; if (st.stamp >= 0) { const a = ease((S.clock - st.stamp) / .25); ctx.save(); ctx.translate(800, 340); ctx.rotate(-.18); text(ctx, 'RECEIVED', -170, 0, 56, `rgba(150,36,30,${a})`, 1, 'Georgia'); ctx.restore(); }
      if (st.stamp < 0 && local > 3) text(ctx, 'click', 820, 160, 34, 'rgba(60,50,40,.6)', 1, HAND);
    }
  },
  doStamp(S, st) { if (st.stamp < 0) { st.stamp = S.clock; A.stamp(); } },
  onDown(S, st, x, y) {
    const s = Math.min(3, Math.floor(S.t / 20)); if (s === 3) this.doStamp(S, st);
    if (s === 2) this.lanterns.forEach(([lx, ly], i) => { if (Math.hypot(x - lx, y - ly) < 60) { st.lit.add(i); A.coin(i % 3); } });
  },
};
const tuesday = {
  id: 'tuesday', title: 'Ordinary Tuesday', part: 'III · Up', dur: 60, vig: .3, ink: 0, mood: { drone: 0, pitch: 55, cut: 800, hum: .02 },
  caps: [[3, 18, 'Nell’s first day.'], [26, 50, 'She reads her number. Six people eat sandwiches.'], [52, 59, 'A child waves.']],
  init: () => ({}),
  paint(ctx, S, t, st) {
    if (t < 24) {
      grad(ctx, 0, H, '#f3e6c8', '#d8c9a4'); for (let i = 0; i < 5; i++) { rect(ctx, 100 + i * 300, 40, 150, 300, 'rgba(255,248,224,.7)'); shaft(ctx, 110 + i * 300, 100, .08); } rect(ctx, 0, 480, W, 190, '#c7b48e');
      for (let i = 0; i < 6; i++) { const x = 200 + i * 240; rect(ctx, x - 90, 450, 180, 16, '#8a6a42'); person(ctx, x, 480, 1.5, i === 3 ? '#7a3a38' : '#4a4a52', { arm: [30, 10 + Math.sin(S.clock * 6 + i) * 3] }); }
      if (t > 8 && t < 11) { disc(ctx, 780, 380, 16 + Math.sin((t - 8) * 3) * 14, 'rgba(40,20,20,.6)'); }
      if (t > 20 && !st.b) { st.b = 1; A.bell(true, .6); }
    } else {
      square(ctx, t, { warm: .95, shaft: .45, crowd: 6, lit: .6 }); person(ctx, 800, 440, 1.3, '#7a3a38', { arm: [18, -12] });
      [0, 1, 2, 3, 4, 5].forEach(i => { disc(ctx, 560 + i * 90, 520 - (Math.sin(S.clock * 3 + i) > .9 ? 6 : 0), 6, '#e0b040'); }); if (t > 50) { const w = Math.sin((t - 50) * 8) * 14; ctx.strokeStyle = '#2a2a2e'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(1180, 560); ctx.lineTo(1190 + w, 524); ctx.stroke(); disc(ctx, 1190 + w, 516, 10, '#2a2a2e'); }
    }
  },
};
const coda = {
  id: 'coda', title: 'The Next Line', part: 'Coda', dur: 70, hold: { at: 34 }, typing: true, vig: .48, ink: 0, mood: { drone: .02, pitch: 49, cut: 400, hum: .03 },
  caps: [[3, 13, 'She locks up.'], [16, 28, '[the bell strikes the hour once]'], [29, 33, 'Far across the lake, a thin grey band.'], [58, 70, '']],
  holdCap: '',
  init: () => ({ val: '', words: '', n: 0, tries: 0 }),
  auto(S, st) { S.witness.words = S.witness.words || 'KEEP THE READING'; },
  paint(ctx, S, t, st) {
    if (t < 14) { grad(ctx, 0, H, '#e0b86a', '#7a5a38'); rect(ctx, 1000, 60, 360, 380, '#f6d89a'); rect(ctx, 0, 480, W, 190, '#5a4228'); rect(ctx, 400, 420, 520, 90, '#3a2a1a'); rect(ctx, 560, 380, 140, 40, '#a88a6a'); person(ctx, 1180, 480, 2.2, '#5a2a2a'); glow(ctx, 1180, 200, 400, '255,200,120', .3); if (t > 8 && !st.t) { st.t = 1; A.nib(); } }
    else if (t < 30) { const g = clamp((t - 20) / 14, 0, 1); grad(ctx, 0, H * .55, '#2a3550', '#e0a878'); grad(ctx, H * .55, H, '#3e5060', '#1a2430'); ctx.fillStyle = `rgba(92,96,102,${.15 + g * .55})`; ctx.fillRect(0, H * .55 - 14, W, 14 + g * 6); if (t > 16 && !st.b) { st.b = 1; A.bell(false, .5); } }
    else {
      grad(ctx, 0, H * .6, '#26304a', '#bb8a6c'); grad(ctx, H * .6, H, '#34485a', '#161e28'); rect(ctx, 0, 250, W, 320, '#8a8478'); ctx.strokeStyle = 'rgba(40,36,30,.3)'; for (let y = 250; y < 570; y += 52) for (let x = 0; x < W; x += 130) ctx.strokeRect(x + ((y - 250) / 52 % 2) * 65, y, 130, 52);
      rect(ctx, 300, 250, 28, 150, 'rgba(70,74,80,.55)'); text(ctx, '214', 270, 440, 26, '#2a2620'); rect(ctx, 700, 250, 28, 120, 'rgba(70,74,80,.55)'); text(ctx, '397', 670, 440, 26, '#2a2620');
      rect(ctx, 1100, 250, 28, 150, 'rgba(70,74,80,.55)'); text(ctx, '611', 1070, 440, 26, '#2a2620'); text(ctx, S.resolved ? '1010' : '', 1210, 440, 26, '#2a2620'); rect(ctx, 1200, 250, 28, 110, 'rgba(18,16,14,.9)');
      rect(ctx, 520, 250, 360, 70, 'rgba(18,16,14,.55)'); const w = (S.witness.words || (S.resolved ? 'KEEP THE READING' : '')).toUpperCase(); const k = Math.min(w.length, Math.floor((S.resolved ? S.clock - (st.at || S.clock) : 0) * 7 + (st.val ? 0 : 0)));
      if (!S.resolved && st.val) text(ctx, st.val.toUpperCase().slice(-24), 540, 300, 36, 'rgba(220,210,190,.9)'); if (S.resolved) { if (!st.at) st.at = S.clock; const shown = w.slice(0, Math.floor((S.clock - st.at) * 8)); text(ctx, shown, 540, 300, 36, '#d6ccb4'); if (shown.length < w.length && Math.floor((S.clock - st.at) * 8) !== st.n) { st.n = Math.floor((S.clock - st.at) * 8); A.chisel(); } }
      if (S.holding) { glow(ctx, 700, 280, 120, '255,220,160', .2 + Math.sin(S.clock * 4) * .08); if (!st.val) text(ctx, 'carve KEEP THE READING', 480, 380, 34, 'rgba(230,220,200,.5)', 1, HAND); }
      if (t > 56) { rect(ctx, 0, 0, W, H, `rgba(0,0,0,${ease((t - 56) / 4)})`); text(ctx, 'THE LONG SPRING', 560, 350, 64, '#d6ccb4', ease((t - 60) / 4), 'Georgia'); }
    }
  },
  onDown(S, st, x, y) { if (S.holding && x > 480 && x < 1000 && y > 350 && y < 410) { S.inp.value = 'KEEP THE READING'; this.onInput('KEEP THE READING', S, st); this.onSubmit('KEEP THE READING', S, st); } },
  onInput(v, S, st) { st.val = v; A.chisel(); },
  onSubmit(v, S, st) { if (!S.holding || !v.trim()) return; if (hasWord(v, 'reading') || ++st.tries >= 2) { S.witness.words = v.trim(); S.resolve(); } },
};

export const SCENES = [prologue, silence, office, tolls, orr, court, hats, copy, archive, noon, spreads, offer, handover, seasons, tuesday, coda];
