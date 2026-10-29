// Entry point: checks the request, picks the room, hands the WebSocket to that room's Durable Object.
export { Room } from './room.js';
import { roomName } from './rooms.js';

function originOk(req, env) {
  const allow = String(env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim()).filter(Boolean);
  if (allow.includes('*')) return true;
  const o = req.headers.get('Origin');
  if (!o) return true; // not a browser page (curl, tests); browsers always send Origin on WebSocket handshakes
  return allow.includes(o) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/health') return new Response('ok', { headers: { 'cache-control': 'no-store' } });
    if (url.pathname !== '/ws') return new Response('Island relay. Connect with a WebSocket to /ws', { status: 200 });
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
    if (!originOk(req, env)) return new Response('Origin not allowed', { status: 403 });
    const stub = env.ROOM.get(env.ROOM.idFromName(roomName(url.searchParams.get('room'))));
    return stub.fetch(req);
  },
};
