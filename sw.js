const CACHE_NAME = 'campuslink-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Syne:wght@400..800&display=swap',
  'https://unpkg.com/lucide@latest'
];

// Install Event
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Caching App Shell Assets...');
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (e) => {
  console.log('Service Worker: Active!');
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Service Worker: Clearing Old Cache...', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event (Network-First with Cache Fallback)
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Make a clone of response
        const resClone = res.clone();
        // Open cache
        caches.open(CACHE_NAME).then((cache) => {
          // Add response to cache if it's a valid local resource or GET request
          if (e.request.method === 'GET' && (e.request.url.startsWith(self.location.origin) || e.request.url.includes('googleapis') || e.request.url.includes('unpkg'))) {
            cache.put(e.request, resClone);
          }
        });
        return res;
      })
      .catch(() => caches.match(e.request).then((res) => res))
  );
});
