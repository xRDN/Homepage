// Serverless multiplayer: Trystero finds peers through public relays, then talks WebRTC directly.
// Everything from peers is untrusted: numbers are clamped, text is length-limited and set as textContent.
const num = (v, m = 14) => Math.max(-m, Math.min(m, Number.isFinite(+v) ? +v : 0));
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
export function createNet(api) {
  const peers = new Map(), name = 'Guest ' + Math.random().toString(16).slice(2, 5);
  let room, send, sendSay, acc = 0;
  const drop = id => { const p = peers.get(id); if (p) { api.drop(p.o); peers.delete(id); api.count(peers.size); } };
  return {
    on: () => !!room,
    list: () => [...peers.values()].map(p => p.o),
    async join() {
      const { joinRoom } = await import('https://cdn.jsdelivr.net/npm/trystero@0.21/+esm');
      room = joinRoom({ appId: 'erdian-island-v1' }, 'main');
      const [sp, gp] = room.makeAction('pos'), [ss, gs] = room.makeAction('say');
      send = sp; sendSay = ss;
      gp((d, id) => {
        if (!d) return;
        let p = peers.get(id);
        if (!p) {
          p = { o: api.make(String(d.t), String(d.n || 'Guest').slice(0, 16)), tx: 0, tz: 0, ty: 0, tr: 0 };
          p.o.mesh.position.set(num(d.x), 0, num(d.z)); peers.set(id, p); api.count(peers.size);
        } else if (p.o.type !== d.t) api.retype(p.o, String(d.t));
        Object.assign(p, { tx: num(d.x), tz: num(d.z), ty: Math.max(0, num(d.y, 5)), tr: num(d.r, 7) });
      });
      gs((m, id) => { const p = peers.get(id); if (p) api.say(p.o, String(m).slice(0, 80)); });
      room.onPeerLeave(drop);
      api.count(0);
    },
    leave() { room && room.leave(); room = null; [...peers.keys()].forEach(drop); },
    say(m) { sendSay && sendSay(m); },
    tick(dt, me, play) {
      if (!room || !me) return;
      if (play && (acc += dt) > .1) {
        acc = 0; const q = me.mesh.position;
        send({ x: +q.x.toFixed(2), z: +q.z.toFixed(2), y: +me.y.toFixed(2), r: +me.mesh.rotation.y.toFixed(2), t: me.type, n: name });
      }
      const k = 1 - Math.exp(-dt * 10);
      for (const p of peers.values()) {
        const m = p.o.mesh, dx = p.tx - m.position.x, dz = p.tz - m.position.z;
        p.o.moving = Math.hypot(dx, dz) > .05;
        m.position.x += dx * k; m.position.z += dz * k;
        m.rotation.y += wrap(p.tr - m.rotation.y) * k;
        p.o.y = p.ty; p.o.vy = 0;
      }
    },
  };
}
