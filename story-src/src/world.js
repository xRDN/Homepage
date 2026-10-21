// The shape of the world: five islands on a lake inside a bowl of hills and distant mountains.
export const ISLANDS = [
  { x: 0, z: 58, r: 18 },    // 1 toll plaza
  { x: 0, z: 18, r: 18 },    // 2 archive
  { x: 0, z: -25, r: 19 },   // 3 rooftops
  { x: 0, z: -70, r: 20 },   // 4 counting house
  { x: 0, z: -122, r: 26 },  // 5 the square
];
export const WATER_Y = -.3;
export const LAKE = { x0: -55, x1: 55, z0: -155, z1: 95 };
const hash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
const vnoise = (x, z) => {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
export const fbm = (x, z) => { let s = 0, a = .5, f = 1; for (let i = 0; i < 4; i++) { s += a * vnoise(x * f, z * f); f *= 2; a *= .5; } return s; };
export const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export function islW(x, z) {
  let w = 0;
  for (const i of ISLANDS) w = Math.max(w, sm(i.r + 1.2, i.r - .6, Math.hypot(x - i.x, z - i.z)));
  return w;
}
export function height(x, z) {
  const isl = islW(x, z);
  const out = Math.hypot(Math.max(0, Math.abs(x) - 42), Math.max(0, z - 82, -152 - z));
  let h = -3.6 - fbm(x * .05 + 7, z * .05) * 1.2 + (fbm(x * .15, z * .15) - .5) * .6;
  h += sm(0, 22, out) * 10 + sm(18, 95, out) * (24 + 56 * fbm(x * .03, z * .03)) * (.6 + .8 * fbm(x * .07 + 3, z * .07));
  return h * (1 - isl);
}
export function paved(x, z) {
  let p = 0;
  for (const i of ISLANDS) {
    const d = Math.hypot(x - i.x, z - i.z);
    p = Math.max(p, sm(i.r * .62, i.r * .5, d), sm(4.5, 3.2, Math.abs(x - i.x)) * sm(i.r - .5, i.r - 2, d));
  }
  return p;
}
export function biome(x, z, h, sl) {
  const n = fbm(x * .2, z * .2);
  if (h > 34) return [.95, .97, 1];
  if (sl > .8 || h > 22) return [.46 + n * .06, .43 + n * .05, .4];
  if (islW(x, z) > .5) return [.30 + n * .12, .58 + n * .14, .24];
  if (h < -1.2) return [.42, .36, .26];
  if (h < .8) return [.78, .72, .52];
  return [.28 + n * .12, .52 + n * .16, .22];
}
