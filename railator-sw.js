const CACHE_NAME = 'static-cache-v0.0.1';

const CACHABLE = [
    '/railator-offline.html'
];

self.addEventListener('install', evt => {
    evt.waitUntil(caches.open(CACHE_NAME).then(cache => {
        return cache.addAll(CACHABLE);
    }));

    self.skipWaiting();
});

self.addEventListener('activate', evt => {
    evt.waitUntil(caches.keys().then(keyList => {
        return Promise.all(keyList.map(key => {
            if (key !== CACHE_NAME) {
                return caches.delete(key);
            }
        }));
    }));

    self.clients.claim();
});

self.addEventListener('fetch', evt => {
    if (evt.request.mode !== 'navigate') {
        return;
    }
    evt.respondWith(fetch(evt.request).catch(() => {
        return caches.open(CACHE_NAME).then((cache) => {
            return cache.match('railator-offline.html');
        });
    }));
});
