const CACHE = 'albnet-v4-push-2026';
const PRECACHE = ['/icon.png', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function isNavigation(request) {
  return request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html');
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname === '/sw.js') return;

  if (isNavigation(event.request) || url.pathname.startsWith('/_next/')) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res.ok && url.origin === self.location.origin && isNavigation(event.request)) {
            const clone = res.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((res) => {
        if (res.ok && url.origin === self.location.origin) {
          const clone = res.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, clone));
        }
        return res;
      });
      return cached || network;
    })
  );
});

/** ——— Web Push (njoftime jashtë app-it) ——— */
self.addEventListener('push', (event) => {
  let data = {
    title: 'AlbNet',
    body: 'Ke një njoftim të ri',
    url: '/njoftime',
    tag: 'albnet',
    icon: '/icon.png',
    badge: '/icon.png',
    requireInteraction: false,
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch {
    if (event.data) data.body = event.data.text();
  }

  const isCall = data.type === 'call';
  const options = {
    body: data.body,
    icon: data.icon || '/icon.png',
    badge: data.badge || '/icon.png',
    tag: data.tag || 'albnet',
    data: { url: data.url || '/njoftime', ...data.data },
    requireInteraction: isCall || Boolean(data.requireInteraction),
    vibrate: isCall ? [300, 100, 300, 100, 300] : [120, 60, 120],
    silent: false,
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(data.title || 'AlbNet', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/njoftime';
  const fullUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.navigate(fullUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(fullUrl);
    })
  );
});

self.addEventListener('notificationclose', () => {
  /* analytics opsional */
});
