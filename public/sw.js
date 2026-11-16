// Offline support for vacationplanner.team: pages are fetched from the network first and kept for offline use;
// built files, flags, holiday data and the globe map are served from the cache. Team data (/api) is never cached here.
const C = "tvp-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== C) await caches.delete(k);
  await self.clients.claim();
})()));
const STATIC = /^\/(_next\/static|flags|hn|geo)\//;
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin || u.pathname.startsWith("/api") || u.searchParams.has("_rsc")) return;
  if (r.mode === "navigate") {
    e.respondWith((async () => {
      try { const res = await fetch(r); if (res.ok) { const c = await caches.open(C); c.put(u.pathname, res.clone()); } return res; }
      catch { const c = await caches.open(C); return (await c.match(u.pathname)) || (await c.match("/")) || Response.error(); }
    })());
    return;
  }
  if (STATIC.test(u.pathname)) {
    e.respondWith((async () => {
      const c = await caches.open(C), hit = await c.match(r);
      if (hit) return hit;
      const res = await fetch(r); if (res.ok) c.put(r, res.clone()); return res;
    })());
  }
});
