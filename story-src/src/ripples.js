// A tiny ring buffer of water ripples shared by the player, the water shader and anything that splashes.
export const T0 = performance.now();
export const now = () => (performance.now() - T0) / 1000;
export const ripBuf = Array.from({ length: 16 }, () => [0, 0, -100, 0]);
let idx = 0;
export function ripple(x, z, amp = .1) { ripBuf[idx] = [x, z, now(), amp]; idx = (idx + 1) % 16; }
