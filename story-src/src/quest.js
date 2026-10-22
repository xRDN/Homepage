// What the player should do next, for the beacon, the edge arrow, Pip's hints and the HUD.
export const BEATS = ['🚧', '📜', '🏠', '⚖️', '🕰️'];
export function objective(S) {
  if (S.ended) return null;
  if (S.stage === 0) return { p: S.gates[0] ? [5, 44] : [-5, 44], text: 'Push a cart onto a toll bridge and into the gate to jam it open.' };
  if (S.stage === 1) return !S.got[0] ? { p: [-11, 21.5], text: 'Find the true pages inside the archive (1 of 2).' } : { p: [-10, 11], text: 'Push a crate against the ledge, climb up, and take the second page.' };
  if (S.stage === 2) return { p: [7, -36], text: 'Cross the townhouse rooftops to the wall of empty hats.' };
  if (S.stage === 3) return { p: [0, -70], text: 'Put a page on each pedestal so its pips match the coins above (press E).' };
  return S.stamp ? null : { p: [-6, -106], text: 'Choose a stamp pedestal to post the pages on the board (press E).' };
}
