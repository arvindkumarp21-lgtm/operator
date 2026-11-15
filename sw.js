// ગુજરાત પુરવઠા ઓપરેટર PWA - ઓટો-અપડેટ અને ઓફલાઇન સર્વર વર્કર (sw.js)
const CACHE_NAME = 'gujarat-purvatha-pwa-v16';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './ICON.jpeg'
];

// 1. Install Event: નવું વર્ઝન આવતા જ તરત જ Activate કરો (Skip Waiting)
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
});

// 2. Activate Event: જૂનો બધો જ Cache સાફ કરી નાખો જેથી હંમેશા નવો જ કોડ દેખાય
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Network-First Strategy (પહેલા GitHub પરથી લાઇવ નવો કોડ લાવો, નેટ ન હોય તો જ Cache વાપરો)
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Firebase Realtime Database ની રિક્વેસ્ટ ક્યારેય Cache ન કરવી (હંમેશા Live જ રાખવી)
  if (req.url.includes('firebasedatabase.app') || req.url.includes('firebaseio.com') || req.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(req)
      .then((networkResponse) => {
        // જો GitHub પરથી નવી ફાઇલ મળી જાય, તો Cache માં પણ અપડેટ કરી દો
        if (networkResponse && networkResponse.status === 200 && req.url.startsWith(self.location.origin)) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // જો ઓપરેટરનું ઇન્ટરનેટ બંધ હોય, તો સેવ થયેલી ઓફલાઇન ફાઇલ બતાવો
        return caches.match(req).then((cachedResponse) => {
          return cachedResponse || caches.match('./index.html');
        });
      })
  );
});
