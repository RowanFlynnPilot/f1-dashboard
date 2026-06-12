/* Service worker — offline reads of the last-fetched dashboard.
 *
 * Strategy:
 *  - Hashed build assets (/assets/...) are immutable → cache-first.
 *  - Everything else same-origin (index.html, data JSON, meeting files) →
 *    network-first with cache fallback, so fresh deploys/data always win when
 *    online and the last good copy serves when offline.
 * Live OpenF1 API calls are cross-origin and intentionally not cached here
 * (the app already caches lap telemetry in sessionStorage).
 */
const CACHE = "f1dash-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;

  if (url.pathname.includes("/assets/")) {
    // Immutable hashed bundles
    e.respondWith(
      caches.open(CACHE).then(async (c) => {
        const hit = await c.match(e.request);
        if (hit) return hit;
        const res = await fetch(e.request);
        if (res.ok) c.put(e.request, res.clone());
        return res;
      })
    );
    return;
  }

  // Network-first for the shell and data files
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
