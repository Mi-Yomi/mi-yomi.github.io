const CACHE_NAME = 'hades-v3';
const IMG_CACHE = 'tmdb-images-v2';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME && k !== IMG_CACHE).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // Cache TMDB images (cache-first, they rarely change)
    if (url.hostname === 'image.tmdb.org') {
        event.respondWith(
            caches.open(IMG_CACHE).then(async (cache) => {
                const cached = await cache.match(request);
                if (cached) return cached;
                const response = await fetch(request);
                if (response.ok) cache.put(request, response.clone());
                return response;
            }).catch(() => caches.match(request))
        );
        return;
    }

    // Hashed assets (/assets/*.js, /assets/*.css) — network only, they're immutable via hash
    if (url.origin === self.location.origin && url.pathname.startsWith('/assets/')) {
        event.respondWith(fetch(request));
        return;
    }

    // App shell (index.html, /) — network-first, cache fallback
    if (url.origin === self.location.origin) {
        event.respondWith(
            fetch(request).then(response => {
                if (response.ok && (url.pathname === '/' || url.pathname.endsWith('.html'))) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                }
                return response;
            }).catch(() => caches.match(request))
        );
    }
});
