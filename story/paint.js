// Painter's toolkit for the animatic: gouache-like layers drawn with Canvas 2D, plus paper grain, vignette and creeping ink.
export const W = 1600, H = 670;
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
export const rnd = seed => { let a = seed | 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = (t + Math.imul(t ^ t >>> 7, 61 | t)) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
export const mixc = (a, b, k) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], clamp(k, 0, 1)))).join(',')})`; };
export const HAND = "'Segoe Script','Bradley Hand','Caveat','Comic Sans MS',cursive";

export function grad(ctx, y0, y1, c0, c1) { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, c0); g.addColorStop(1, c1); ctx.fillStyle = g; ctx.fillRect(0, y0, W, y1 - y0); }
export function rect(ctx, x, y, w, h, fill) { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); }
export function disc(ctx, x, y, r, fill) { ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill(); }
export function hills(ctx, base, amp, color, seed, off = 0) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 40) ctx.lineTo(x, base + Math.sin((x + off) * .006 + seed) * amp + Math.sin((x + off) * .017 + seed * 2) * amp * .35);
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
}
export function glow(ctx, x, y, r, rgb, a = 1) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
}
export function shaft(ctx, x, w, a, rgb = '255,240,200') {
  if (a <= 0) return; ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(x, 0, x + w * .6, H); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + w * .3, 0); ctx.lineTo(x + w * 1.4, H); ctx.lineTo(x + w * .5, H); ctx.closePath(); ctx.fill(); ctx.restore();
}
export function person(ctx, x, y, s, col, o = {}) {      // y is the feet
  ctx.save(); ctx.translate(x, y); ctx.scale(s * (o.flip ? -1 : 1), s); ctx.fillStyle = col; ctx.strokeStyle = col;
  ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-14, -70); ctx.quadraticCurveTo(0, -86, 14, -70); ctx.lineTo(18, 0); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -92 + (o.bob || 0), 11, 0, 6.2832); ctx.fill();
  if (o.arm) { ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(10, -64); ctx.lineTo(10 + o.arm[0], -64 + o.arm[1]); ctx.stroke(); }
  if (o.hat) { ctx.fillStyle = o.hat; ctx.fillRect(-14, -108 + (o.bob || 0), 28, 6); ctx.fillRect(-8, -122 + (o.bob || 0), 16, 16); }
  ctx.restore();
}
export function crowd(ctx, n, x0, x1, y, s, col, seed, t, lit = 0) {
  const r = rnd(seed);
  for (let i = 0; i < n; i++) { const px = lerp(x0, x1, r()), py = y + r() * 70, sc = s * (.8 + r() * .4) * (1 + (py - y) / 400); person(ctx, px, py, sc, i < lit ? '#d9a35f' : col, { bob: Math.sin(t * 1.5 + i) * 1.2 }); }
}
export function house(ctx, x, y, w, h, wall, roof, lit = 0) {     // y is the ground line
  ctx.fillStyle = wall; ctx.fillRect(x - w / 2, y - h, w, h);
  ctx.fillStyle = roof; ctx.beginPath(); ctx.moveTo(x - w / 2 - 14, y - h); ctx.lineTo(x + w / 2 + 14, y - h); ctx.lineTo(x, y - h - h * .5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = `rgba(255,214,140,${.18 + lit * .7})`; ctx.fillRect(x - w * .3, y - h * .7, w * .18, h * .22); ctx.fillRect(x + w * .12, y - h * .7, w * .18, h * .22);
  ctx.fillStyle = 'rgba(30,22,16,.55)'; ctx.fillRect(x - w * .08, y - h * .38, w * .16, h * .38);
}
export function tower(ctx, x, y, s, wall, roof) {
  ctx.fillStyle = wall; ctx.fillRect(x - 40 * s, y - 330 * s, 80 * s, 330 * s);
  ctx.fillStyle = roof; ctx.beginPath(); ctx.moveTo(x - 54 * s, y - 330 * s); ctx.lineTo(x + 54 * s, y - 330 * s); ctx.lineTo(x, y - 410 * s); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(20,16,12,.7)'; ctx.fillRect(x - 16 * s, y - 310 * s, 32 * s, 46 * s);
  disc(ctx, x, y - 200 * s, 24 * s, 'rgba(250,240,215,.85)');
}
export function dust(ctx, t, n, seed, a = .5, region = [0, 0, W, H]) {
  const r = rnd(seed); ctx.fillStyle = `rgba(255,240,210,${a})`;
  for (let i = 0; i < n; i++) { const x = region[0] + ((r() * region[2] + t * (6 + r() * 10)) % region[2]), y = region[1] + ((r() * region[3] + Math.sin(t * .4 + i) * 20 + t * 4) % region[3]); ctx.fillRect(x, y, 2, 2); }
}
export function ghostHand(ctx, x, y, s, rot, a, col) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.globalAlpha = a; ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.ellipse(0, 0, 22, 28, 0, 0, 6.2832); ctx.fill();
  ctx.lineWidth = 8; [[-15, -22, -19, -52], [-5, -27, -5, -60], [6, -27, 8, -58], [16, -22, 22, -48]].forEach(([a1, b1, a2, b2]) => { ctx.beginPath(); ctx.moveTo(a1, b1); ctx.lineTo(a2, b2); ctx.stroke(); });
  ctx.beginPath(); ctx.moveTo(-20, 6); ctx.lineTo(-40, -8); ctx.stroke();
  ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(0, 24); ctx.lineTo(0, 70); ctx.stroke(); ctx.restore();
}
let tile;
function grain() {
  if (tile || typeof document === 'undefined') return tile;
  tile = document.createElement('canvas'); tile.width = tile.height = 192; const c = tile.getContext('2d'), d = c.createImageData(192, 192), r = rnd(5);
  for (let i = 0; i < d.data.length; i += 4) { const v = 110 + r() * 90; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 40; }
  c.putImageData(d, 0, 0); return tile;
}
// Final pass for every scene: paper grain, vignette, and the ink that creeps in from the edges through Part I.
export function finish(ctx, o) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, W * .66); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${o.vig})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (o.ink > .01) { const r = rnd(11); ctx.fillStyle = 'rgba(8,8,14,.6)'; for (let i = 0; i < 16; i++) { const e = i % 4, bx = e < 2 ? r() * W : (e === 2 ? 0 : W), by = e >= 2 ? r() * H : (e === 0 ? 0 : H); disc(ctx, bx, by, o.ink * (70 + r() * 150) * (1 + Math.sin(o.t * .5 + i) * .05), ctx.fillStyle); } }
  const t = grain(); if (t) { ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = .35; ctx.fillStyle = ctx.createPattern(t, 'repeat'); ctx.translate((o.t * 37) % 192, (o.t * 23) % 192); ctx.fillRect(-192, -192, W + 384, H + 384); ctx.restore(); }
}
