// Multiplayer. Preferred: a small relay (worker/ folder, Cloudflare Durable Object) that every visitor connects to over a
// WebSocket, so it works across any network and visitors never see each other's IP. If no relay is configured
// (js/config.js) it falls back to Trystero: serverless WebRTC through public relays, which can fail behind strict NATs.
// Everything from other visitors is untrusted: numbers are clamped, text is length-limited and shown as textContent.
import { RELAY } from './config.js';

const num = (v, m = 14) => Math.max(-m, Math.min(m, Number.isFinite(+v) ? +v : 0));
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const STALE = 20000; // relay mode: a visitor we haven't heard from in 20 s is gone (their tab was closed or asleep)

export function createNet(api) {
  const peers = new Map(), name = 'Guest ' + Math.random().toString(16).slice(2, 5);
  const roomName = (new URLSearchParams(location.search).get('room') || 'main').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24) || 'main';
  let mode = '', room, send, sendSay, ws, want = false, tries = 0, hb = 0, pong = 0, retryT = 0, acc = 0, beat = 0, last = '';

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
  function onMsg(raw) {
    if (raw === 'pong') { pong = performance.now(); return; }
    let d; try { d = JSON.parse(raw); } catch { return; }
    if (!d || typeof d !== 'object') return;
    if (d.t === 'welcome') { (Array.isArray(d.peers) ? d.peers.slice(0, 100) : []).forEach(q => q && upsert(String(q.id), q)); }
    else if (d.t === 'pos') upsert(String(d.id), d);
    else if (d.t === 'say') { const p = peers.get(String(d.id)); if (p) api.say(p.o, String(d.m).slice(0, 80)); }
    else if (d.t === 'leave') drop(String(d.id));
  }
  function open() {
    clearTimeout(retryT);
    ws = new WebSocket(`${RELAY.replace(/\/+$/, '')}/ws?room=${encodeURIComponent(roomName)}`);
    return new Promise((ok, no) => {
      const timer = setTimeout(() => { try { ws.close(); } catch {} no(new Error('timeout')); }, 8000);
      ws.onopen = () => {
        clearTimeout(timer); tries = 0; pong = performance.now(); last = ''; beat = 99;
        api.status?.('online'); api.count?.(peers.size);
        hb = setInterval(() => { // keep-alive, and notice a connection that died without telling us
          if (performance.now() - pong > 70000) { try { ws.close(); } catch {} return; }
          try { ws.send('ping'); } catch {}
        }, 25000);
        ok();
      };
      ws.onmessage = e => onMsg(e.data);
      ws.onerror = () => {};
      ws.onclose = () => {
        clearTimeout(timer); clearInterval(hb); dropAll();
        if (!want) return;
        if (!tries && !pong) return no(new Error('closed'));
        api.status?.('retry'); tries++;
        retryT = setTimeout(() => { if (want) open().catch(() => {}); }, Math.min(15000, 1000 * 2 ** Math.min(tries, 4)));
      };
    });
  }

  // ---- fallback: serverless peer-to-peer ----
  async function joinP2P() {
    const { joinRoom } = await import('https://cdn.jsdelivr.net/npm/trystero@0.21/+esm');
    room = joinRoom({ appId: 'erdian-island-v1' }, roomName);
    const [sp, gp] = room.makeAction('pos'), [ss, gs] = room.makeAction('say');
    send = sp; sendSay = ss;
    gp((d, id) => d && upsert(id, d));
    gs((m, id) => { const p = peers.get(id); if (p) api.say(p.o, String(m).slice(0, 80)); });
    room.onPeerLeave(drop);
    api.count?.(0); api.status?.('online');
  }

  return {
    relay: !!RELAY,
    room: roomName,
    on: () => want,
    list: () => [...peers.values()].map(p => p.o),
    async join() {
      if (want) return;
      want = true; pong = 0; tries = 0;
      try {
        if (RELAY) { mode = 'relay'; api.status?.('connecting'); await open(); }
        else { mode = 'p2p'; api.status?.('connecting'); await joinP2P(); }
      } catch (e) { want = false; mode = ''; api.status?.('off'); throw e; }
    },
    leave() {
      want = false; clearTimeout(retryT); clearInterval(hb);
      if (ws) { try { ws.close(); } catch {} ws = null; }
      if (room) { room.leave(); room = null; }
      send = sendSay = null; dropAll(); mode = ''; api.status?.('off');
    },
    say(m) {
      if (mode === 'relay') { if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'say', m: String(m).slice(0, 80) })); }
      else sendSay && sendSay(m);
    },
    tick(dt, me, play) {
      if (!mode || !me) return;
      if (play) {
        acc += dt; beat += dt;
        const q = me.mesh.position;
        if (mode === 'relay') {
          // send when something changed (max 10/s) and at least every 2 s as a "still here" signal
          if (acc > .1 && ws && ws.readyState === 1) {
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
