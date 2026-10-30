// Privacy-friendly visit stats: one Durable Object holds daily counters, nothing else.
// No cookies, no visitor IDs, no IP addresses, no user agents are ever stored: a "hit" is just +1 on (day, event).
// Read them at /stats?key=YOUR_STATS_KEY (set the key with `npx wrangler secret put STATS_KEY`).
import { DurableObject } from 'cloudflare:workers';

export const EVENT = /^[a-z_]{2,16}(:[a-z0-9-]{1,24})?$/; // e.g. "enter", "project:island-app", "sky:cosmic"
const KEEP_DAYS = 400, MAX_EVENTS_PER_DAY = 300;
const day = (d = new Date()) => d.toISOString().slice(0, 10);

export class Stats extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec('CREATE TABLE IF NOT EXISTS counts (day TEXT NOT NULL, ev TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, ev))');
  }
  hit(ev) {
    if (!EVENT.test(ev)) return false;
    const d = day();
    const known = this.sql.exec('SELECT 1 FROM counts WHERE day = ? AND ev = ?', d, ev).toArray().length;
    if (!known && this.sql.exec('SELECT COUNT(*) AS c FROM counts WHERE day = ?', d).one().c >= MAX_EVENTS_PER_DAY) return false; // stop junk event names piling up
    this.sql.exec('INSERT INTO counts (day, ev, n) VALUES (?, ?, 1) ON CONFLICT(day, ev) DO UPDATE SET n = n + 1', d, ev);
    if (Math.random() < .01) this.sql.exec('DELETE FROM counts WHERE day < ?', day(new Date(Date.now() - KEEP_DAYS * 864e5)));
    return true;
  }
  report(days = 30) {
    const from = day(new Date(Date.now() - (days - 1) * 864e5));
    return this.sql.exec('SELECT day, ev, n FROM counts WHERE day >= ? ORDER BY day', from).toArray();
  }
}

// A small self-contained HTML dashboard (no scripts, no external requests).
export function dashboard(rows, days) {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const dates = [...Array(days)].map((_, i) => day(new Date(Date.now() - (days - 1 - i) * 864e5)));
  const byEv = new Map();
  for (const r of rows) { if (!byEv.has(r.ev)) byEv.set(r.ev, {}); byEv.get(r.ev)[r.day] = r.n; }
  const order = ['visit', 'enter', 'board', 'tour_start', 'tour_done', 'tour_skip', 'online', 'pet', 'fish', 'share', 'shared_open', 'haunt'];
  const evs = [...byEv.keys()].sort((a, b) => ((order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99)) || a.localeCompare(b));
  const max = Math.max(1, ...rows.map(r => r.n));
  const line = ev => {
    const m = byEv.get(ev), tot = dates.reduce((s, d) => s + (m[d] || 0), 0), wk = dates.slice(-7).reduce((s, d) => s + (m[d] || 0), 0);
    const bars = dates.map(d => `<i title="${d}: ${m[d] || 0}" style="height:${Math.round(((m[d] || 0) / max) * 100)}%"></i>`).join('');
    return `<tr><th>${esc(ev)}</th><td class="n">${dates.at(-1) in m ? m[dates.at(-1)] : 0}</td><td class="n">${wk}</td><td class="n">${tot}</td><td><div class="sp">${bars}</div></td></tr>`;
  };
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Island stats</title>
<style>body{font:15px system-ui,sans-serif;margin:2rem auto;max-width:56rem;padding:0 1rem;color:#24302a;background:#f7f5ef}h1{font-size:1.3rem}p{color:#5c6b62}
table{border-collapse:collapse;width:100%;background:#fff;border-radius:12px;overflow:hidden}th,td{padding:.45rem .7rem;border-bottom:1px solid #eee;text-align:left}th{font-weight:600}
td.n{text-align:right;font-variant-numeric:tabular-nums}thead th{font-size:.75rem;text-transform:uppercase;color:#7b8a80}.sp{display:flex;align-items:end;gap:2px;height:28px;width:${days * 6}px}
.sp i{flex:1;background:#5aa469;min-height:1px;border-radius:1px}</style>
<h1>🏝️ Island stats · last ${days} days</h1><p>Daily counters only. No cookies, no IDs, no IP addresses. Visitors with Do Not Track / Global Privacy Control, or who switched stats off, are not counted.</p>
<table><thead><tr><th>Event</th><th>Today</th><th>7 days</th><th>${days} days</th><th>Per day</th></tr></thead><tbody>${evs.map(line).join('') || '<tr><td colspan=5>No data yet.</td></tr>'}</tbody></table>`;
}
