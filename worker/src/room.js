// One room = one Durable Object. Uses hibernating WebSockets: idle rooms cost nothing, and each socket's
// last known state lives in its attachment, so nothing is lost when the object is evicted from memory.
//
// Messages are JSON text. Client -> server: {t:'pos',x,z,y,r,k,n} · {t:'say',m} · the plain string "ping".
// Server -> client: {t:'welcome',id,peers:[...]} · {t:'pos',id,...} · {t:'say',id,m} · {t:'leave',id} · "pong".
// Everything a client sends is untrusted: numbers are clamped, text is cleaned and length-limited, and each
// socket has token buckets so one visitor can't flood the room.
import { DurableObject } from 'cloudflare:workers';
import { roomName, isPublic } from './rooms.js';

const EMOTES = new Set(['👋', '💃', '❤️']); // the only text allowed in public rooms

const num = (v, m) => { v = +v; return Number.isFinite(v) ? Math.max(-m, Math.min(m, v)) : 0; };
const text = (v, n) => String(v ?? '').replace(/[\x00-\x1f\x7f-\x9f]/g, '').split(String.fromCharCode(8232)).join(' ').split(String.fromCharCode(8233)).join(' ').trim().slice(0, n);
const kind = v => (/^[a-z]{1,12}$/.test(String(v)) ? String(v) : 'slime');

// token bucket: refills `rate` per second up to `cap`; returns true if one token could be taken
function take(a, key, now, rate, cap) {
  const b = a[key] || (a[key] = { n: cap, t: now });
  b.n = Math.min(cap, b.n + (now - b.t) / 1000 * rate); b.t = now;
  if (b.n < 1) return false;
  b.n -= 1; return true;
}

export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    // the client's keep-alive "ping" is answered without waking the object
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    this.max = Math.max(2, Math.min(100, +env.MAX_PER_ROOM || 7));
  }

  async fetch(req) {
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
    const pub = isPublic(roomName(new URL(req.url).searchParams.get('room')));
    const live = this.ctx.getWebSockets();
    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);
    if (live.length >= this.max) { // full: say so properly (a refused handshake looks like "server down" to a browser) and hang up
      server.send(JSON.stringify({ t: 'full', max: this.max }));
      server.close(4001, 'full');
      return new Response(null, { status: 101, webSocket: client });
    }
    const id = crypto.randomUUID().slice(0, 8);
    const peers = live.map(w => w.deserializeAttachment()).filter(a => a && a.p).map(a => ({ id: a.id, ...a.p }));
    server.serializeAttachment({ id, p: null, pub });
    server.send(JSON.stringify({ t: 'welcome', id, peers, pub, max: this.max }));
    return new Response(null, { status: 101, webSocket: client });
  }

  send(ws, obj) { try { ws.send(typeof obj === 'string' ? obj : JSON.stringify(obj)); } catch {} }
  fan(obj, except) { const s = JSON.stringify(obj); for (const w of this.ctx.getWebSockets()) if (w !== except) this.send(w, s); }

  webSocketMessage(ws, raw) {
    if (typeof raw !== 'string' || raw.length > 400) return;
    let d; try { d = JSON.parse(raw); } catch { return; }
    if (!d || typeof d !== 'object') return;
    const a = ws.deserializeAttachment(); if (!a) return;
    const now = Date.now();
    if (d.t === 'pos') {
      if (!take(a, 'bp', now, 15, 25)) return;
      a.p = { x: +num(d.x, 14).toFixed(2), z: +num(d.z, 14).toFixed(2), y: +Math.max(0, num(d.y, 5)).toFixed(2), r: +num(d.r, 7).toFixed(2), k: kind(d.k), n: text(d.n, 16) || 'Guest' };
      ws.serializeAttachment(a);
      this.fan({ t: 'pos', id: a.id, ...a.p }, ws);
    } else if (d.t === 'say') {
      if (!take(a, 'bs', now, .5, 4)) return; // a burst of 4, then one every 2 s
      const m = text(d.m, 80); if (!m) return;
      if (a.pub && !EMOTES.has(m)) return; // strangers' text never reaches a public room, only emotes
      ws.serializeAttachment(a);
      this.fan({ t: 'say', id: a.id, m }, ws);
    }
  }

  webSocketClose(ws, code) {
    const a = ws.deserializeAttachment();
    try { ws.close(code && code >= 1000 && code < 5000 && code !== 1005 && code !== 1006 ? code : 1000, 'bye'); } catch {}
    if (a) this.fan({ t: 'leave', id: a.id }, ws);
  }
  webSocketError(ws) { this.webSocketClose(ws, 1011); }
}
