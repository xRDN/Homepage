// Entry point: checks the request, then either hands a WebSocket to its room, or records / shows anonymous stats.
export { Room } from './room.js';
export { Stats } from './stats.js';
import { roomName } from './rooms.js';
import { EVENT, dashboard } from './stats.js';

function originOk(req, env) {
  const allow = String(env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim()).filter(Boolean);
  if (allow.includes('*')) return true;
  const o = req.headers.get('Origin');
  if (!o) return true; // not a browser page (curl, tests); browsers always send Origin on WebSocket handshakes and beacons
  return allow.includes(o) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);
}

// Per-isolate flood guard for /hit. The address is only a key in this in-memory map for at most a minute; it is never stored.
const recent = new Map(); let sweep = 0;
function tooMany(ip) {
  const now = Date.now();
  if (now - sweep > 60000) { recent.clear(); sweep = now; }
  const n = (recent.get(ip) || 0) + 1; recent.set(ip, n);
  return n > 60; // 60 events a minute from one address is plenty for a real visitor
}

const cors = req => ({ 'access-control-allow-origin': req.headers.get('Origin') || '*', 'cache-control': 'no-store' });

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/health') return new Response('ok', { headers: { 'cache-control': 'no-store' } });

    if (url.pathname === '/hit') { // anonymous counter: body is {"e":"event-name"} (sent with navigator.sendBeacon)
      if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors(req), 'access-control-allow-methods': 'POST', 'access-control-allow-headers': 'content-type' } });
      if (req.method !== 'POST' || !originOk(req, env)) return new Response(null, { status: 403 });
      if (req.headers.get('DNT') === '1' || req.headers.get('Sec-GPC') === '1') return new Response(null, { status: 204, headers: cors(req) });
      if (tooMany(req.headers.get('CF-Connecting-IP') || 'x')) return new Response(null, { status: 429, headers: cors(req) });
      let e = ''; try { e = String(JSON.parse((await req.text()).slice(0, 200)).e || ''); } catch {}
      if (!EVENT.test(e)) return new Response(null, { status: 400, headers: cors(req) });
      await env.STATS.get(env.STATS.idFromName('all')).hit(e);
      return new Response(null, { status: 204, headers: cors(req) });
    }

    if (url.pathname === '/stats') { // the owner's dashboard
      if (!env.STATS_KEY) return new Response('Stats are off until you set a key: npx wrangler secret put STATS_KEY', { status: 404 });
      if (url.searchParams.get('key') !== env.STATS_KEY) return new Response('Wrong key', { status: 403 });
      const days = Math.max(1, Math.min(90, +url.searchParams.get('days') || 30));
      const rows = await env.STATS.get(env.STATS.idFromName('all')).report(days);
      if (url.searchParams.get('format') === 'json') return Response.json(rows, { headers: { 'cache-control': 'no-store' } });
      return new Response(dashboard(rows, days), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
    }

    if (url.pathname !== '/ws') return new Response('Island relay. Connect with a WebSocket to /ws', { status: 200 });
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
    if (!originOk(req, env)) return new Response('Origin not allowed', { status: 403 });
    const stub = env.ROOM.get(env.ROOM.idFromName(roomName(url.searchParams.get('room'))));
    return stub.fetch(req);
  },
};
