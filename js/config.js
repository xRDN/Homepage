// Where the multiplayer relay lives. After `wrangler deploy` (see worker/README in the main README), paste its address here:
//   export const RELAY = 'wss://island-relay.YOUR-NAME.workers.dev';
// Set to '' and the 🌐 button falls back to serverless peer-to-peer (Trystero), which often can't connect across networks.
const stored = (() => { try { return localStorage.getItem('island.relay') || ''; } catch { return ''; } })(); // handy for testing: localStorage.setItem('island.relay','ws://localhost:8787')
export const RELAY = stored || 'wss://island-relay.rdnconnects.workers.dev';
