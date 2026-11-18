const CACHE_NAME = 'gujarat-purvatha-pwa-v16';
const ASSETS_TO_CACHE = ['./', './index.html', './ICON.jpeg'];
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS_TO_CACHE).catch(()=>{}))); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.url.includes('workers.dev') || e.request.url.includes('data.json') || e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(res => { if (res && res.status === 200 && e.request.url.startsWith(self.location.origin)) { const clone = res.clone(); caches.open(CACHE_NAME).then(c => c.put(e.request, clone)); } return res; }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
});