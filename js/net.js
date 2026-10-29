// Multiplayer. Preferred: a small relay (worker/ folder, Cloudflare Durable Object) that every visitor connects to over a
// WebSocket, so it works across any network and visitors never see each other's IP. If no relay is configured
// (js/config.js) it falls back to Trystero: serverless WebRTC through public relays, which can fail behind strict NATs.
//
// Rooms hold 7. Visitors land in the public rooms "main", "main-2", "main-3"… (the next one is tried when a room is full).
// Public rooms only carry positions and emotes. Open the page with ?room=our-name to share a private room where text chat works.
// Everything from other visitors is untrusted: numbers are clamped, text is length-limited and shown as textContent.
import { RELAY } from './config.js';

const num = (v, m = 14) => Math.max(-m, Math.min(m, Number.isFinite(+v) ? +v : 0));
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const STALE = 20000; // relay mode: a visitor we haven't heard from in 20 s is gone (their tab was closed or asleep)
const EMOTES = ['👋', '💃', '❤️'];
const clean = v => String(v || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24);

export function createNet(api) {
  const peers = new Map(), name = 'Guest ' + Math.random().toString(16).slice(2, 5);
  const wanted = clean(new URLSearchParams(location.search).get('room')) || 'main';
  const publicRoom = /^main(-\d+)?$/.test(wanted);
  const rooms = publicRoom ? ['main', ...Array.from({ length: 8 }, (_, i) => `main-${i + 2}`)] : [wanted];
  let roomName = rooms[0], pub = publicRoom, mode = '';
  let room, send, sendSay, ws, want = false, connected = false, retrying = false, tries = 0, hb = 0, pong = 0, retryT = 0, acc = 0, beat = 0, last = '';

  const drop = id => { const p = peers.get(id); if (p) { api.drop(p.o); peers.delete(id); api.count?.(peers.size); } };
  const dropAll = () => [...peers.keys()].forEach(drop);

  // one place that creates or updates a remote visitor, whichever transport delivered the message
  function upsert(id, d) {
    if (!d) return;
    let p = peers.get(id);
    const t = String(d.k ?? d.t ?? 'slime');
    if (!p) {
      p = { o: api.make(t, String(d.n || 'Guest').slice(0, 16)), tx: 0, tz: 0, ty: 0, tr: 0, seen: 0 };
      p.o.mesh.position.set(num(d.x), 0, num(d.z)); peers.set(id, p); api.count?.(peers.size);
    } else if (p.o.type !== t) api.retype(p.o, t);
    Object.assign(p, { tx: num(d.x), tz: num(d.z), ty: Math.max(0, num(d.y, 5)), tr: num(d.r, 7), seen: performance.now() });
  }

  // ---- relay (WebSocket) ----
  function handle(d) {
    if (d.t === 'welcome') { (Array.isArray(d.peers) ? d.peers.slice(0, 20) : []).forEach(q => q && upsert(String(q.id), q)); }
    else if (d.t === 'pos') upsert(String(d.id), d);
    else if (d.t === 'say') { const p = peers.get(String(d.id)); if (p) api.say(p.o, String(d.m).slice(0, 80)); }
    else if (d.t === 'leave') drop(String(d.id));
  }
  // Opens one room. Resolves once the server says "welcome", rejects with Error('full') if the room has 7 already.
  function open() {
    clearTimeout(retryT);
    return new Promise((ok, no) => {
      let welcomed = false, settled = false;
      const fail = e => { if (!settled) { settled = true; clearTimeout(timer); no(e); } };
      const sock = ws = new WebSocket(`${RELAY.replace(/\/+$/, '')}/ws?room=${encodeURIComponent(roomName)}`);
      const timer = setTimeout(() => { try { sock.close(); } catch {} fail(new Error('timeout')); }, 8000);
      sock.onmessage = e => {
        if (sock !== ws) return;
        if (e.data === 'pong') { pong = performance.now(); return; }
        let d; try { d = JSON.parse(e.data); } catch { return; }
        if (!d || typeof d !== 'object') return;
        if (d.t === 'full') { try { sock.close(); } catch {} return fail(new Error('full')); }
        if (d.t === 'welcome' && !welcomed) {
          welcomed = settled = true; connected = true; clearTimeout(timer);
          tries = 0; retrying = false; pub = d.pub !== false; pong = performance.now(); last = ''; beat = 99;
          hb = setInterval(() => { // keep-alive, and notice a connection that died without telling us
            if (performance.now() - pong > 70000) { try { sock.close(); } catch {} return; }
            try { sock.send('ping'); } catch {}
          }, 25000);
          api.status?.('online'); ok();
        }
        handle(d);
      };
      sock.onerror = () => {};
      sock.onclose = () => {
        clearTimeout(timer);
        if (sock !== ws) return;
        clearInterval(hb);
        if (!welcomed) return fail(new Error('closed'));
        connected = false; dropAll();
        if (want) retry();
      };
    });
  }
  async function connect() {
    let err = new Error('full');
    for (const r of rooms) {
      roomName = r;
      try { await open(); return; } catch (e) { if (e.message !== 'full') throw e; err = e; }
    }
    throw err; // every room is full
  }
  function retry() {
    if (!want) return;
    if (!retrying) { retrying = true; api.status?.('retry'); }
    tries++;
    retryT = setTimeout(() => { if (want) connect().catch(retry); }, Math.min(15000, 1000 * 2 ** Math.min(tries, 4)));
  }

  // ---- fallback: serverless peer-to-peer ----
  async function joinP2P() {
    const { joinRoom } = await import('https://cdn.jsdelivr.net/npm/trystero@0.21/+esm');
    room = joinRoom({ appId: 'erdian-island-v1' }, wanted);
    const [sp, gp] = room.makeAction('pos'), [ss, gs] = room.makeAction('say');
    send = sp; sendSay = ss; pub = false;
    gp((d, id) => d && upsert(id, d));
    gs((m, id) => { const p = peers.get(id); if (p) api.say(p.o, String(m).slice(0, 80)); });
    room.onPeerLeave(drop);
    api.count?.(0); api.status?.('online');
  }

  return {
    relay: !!RELAY,
    get room() { return roomName; },
    get public() { return mode === 'relay' && pub; },
    on: () => want,
    list: () => [...peers.values()].map(p => p.o),
    async join() {
      if (want) return;
      want = true; tries = 0; retrying = false;
      try {
        api.status?.('connecting');
        if (RELAY) { mode = 'relay'; await connect(); }
        else { mode = 'p2p'; await joinP2P(); }
      } catch (e) { want = false; mode = ''; api.status?.('off'); throw e; }
    },
    leave() {
      want = false; connected = false; clearTimeout(retryT); clearInterval(hb);
      if (ws) { try { ws.close(); } catch {} ws = null; }
      if (room) { room.leave(); room = null; }
      send = sendSay = null; dropAll(); mode = ''; api.status?.('off');
    },
    // returns 'sent', 'blocked' (text in a public room: only emotes go out there) or 'offline'
    say(m) {
      if (mode === 'relay') {
        if (!connected || !ws || ws.readyState !== 1) return 'offline';
        if (pub && !EMOTES.includes(m)) return 'blocked';
        ws.send(JSON.stringify({ t: 'say', m: String(m).slice(0, 80) })); return 'sent';
      }
      if (mode === 'p2p' && sendSay) { sendSay(m); return 'sent'; }
      return 'offline';
    },
    tick(dt, me, play) {
      if (!mode || !me) return;
      if (play) {
        acc += dt; beat += dt;
        const q = me.mesh.position;
        if (mode === 'relay') {
          // send when something changed (max 10/s) and at least every 2 s as a "still here" signal
          if (acc > .1 && connected && ws && ws.readyState === 1) {
            const m = { t: 'pos', x: +q.x.toFixed(2), z: +q.z.toFixed(2), y: +me.y.toFixed(2), r: +me.mesh.rotation.y.toFixed(2), k: me.type, n: name }, key = `${m.x},${m.z},${m.y},${m.r},${m.k}`;
            if (key !== last || beat > 2) { last = key; beat = 0; ws.send(JSON.stringify(m)); }
            acc = 0;
          }
        } else if (acc > .1 && send) {
          acc = 0; send({ x: +q.x.toFixed(2), z: +q.z.toFixed(2), y: +me.y.toFixed(2), r: +me.mesh.rotation.y.toFixed(2), t: me.type, n: name });
        }
      }
      const k = 1 - Math.exp(-dt * 10), now = performance.now();
      for (const [id, p] of peers) {
        if (mode === 'relay' && now - p.seen > STALE) { drop(id); continue; }
        const m = p.o.mesh, dx = p.tx - m.position.x, dz = p.tz - m.position.z;
        p.o.moving = Math.hypot(dx, dz) > .05;
        m.position.x += dx * k; m.position.z += dz * k;
        m.rotation.y += wrap(p.tr - m.rotation.y) * k;
        p.o.y = p.ty; p.o.vy = 0;
      }
    },
  };
}
