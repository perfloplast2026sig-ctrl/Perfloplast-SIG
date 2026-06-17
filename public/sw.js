const CACHE_NAME = "nexo-inventario-v3";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const IS_LOCAL = LOCAL_HOSTS.has(self.location.hostname);

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME || IS_LOCAL).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
      .then(() => IS_LOCAL ? self.registration.unregister() : undefined),
  );
});

self.addEventListener("fetch", (event) => {
  if (IS_LOCAL) return;

  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/_next/") || url.pathname === "/sw.js") return;
  if (request.mode === "navigate" || request.destination === "document") return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (!response.ok) return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request)),
  );
});
