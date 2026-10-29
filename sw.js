// Offline cache. Bump VERSION when you want every visitor to drop old files.
// - the island's own files: network first (always fresh when online, 3 s timeout), cached copy when offline or slow
// - versioned CDN files (three.js): cache first, they never change
// - other CDN files (multiplayer, optional on-device model runtime): stale while revalidate
// Weather requests, peer-to-peer traffic and model weights are never touched.
const VERSION = 'island-v4';
const SHELL = ['./', './index.html', './css/style.css', './js/main.js', './js/layout.js', './js/weather.js', './js/props.js', './js/sound.js', './js/ai.js', './js/fish.js', './js/net.js', './js/config.js'];
const THREE = 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.allSettled([...SHELL, THREE].map(u => c.add(u)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const put = (req, res) => { if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return res; };
const timeout = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('slow')), ms))]);

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (url.origin === location.origin) {
    e.respondWith(timeout(fetch(req), 3000).then(r => put(req, r)).catch(() => caches.match(req).then(m => m || fetch(req))));
  } else if (url.hostname === 'cdn.jsdelivr.net' && /\/npm\/three@/.test(url.pathname)) {
    e.respondWith(caches.match(req).then(m => m || fetch(req).then(r => put(req, r))));
  } else if (url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'esm.run') {
    e.respondWith(caches.match(req).then(m => { const net = fetch(req).then(r => put(req, r)).catch(() => m); return m || net; }));
  }
});
