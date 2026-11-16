// Offline support for vacationplanner.team. Pages: network first (6 s), the last copy when offline.
// Built files (hashed names, never change): cache first, oldest trimmed. Flags, holiday names and the globe map:
// served from the cache at once and refreshed in the background, so updates reach returning visitors.
// Team data (/api) and React data requests (?_rsc) are never cached here.
const C = "tvp-v2";
const MAX_BUILT = 160;
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== C) await caches.delete(k);
  await self.clients.claim();
})()));
const BUILT = /^\/_next\/static\//, DATA = /^\/(flags|hn|geo)\//;
const timeout = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error("slow")), ms))]);
async function trim(c) {
  const keys = (await c.keys()).filter(r => BUILT.test(new URL(r.url).pathname));
  for (let i = 0; i < keys.length - MAX_BUILT; i++) await c.delete(keys[i]);
}
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin || u.pathname.startsWith("/api") || u.searchParams.has("_rsc")) return;
  if (r.mode === "navigate") {
    e.respondWith((async () => {
      const c = await caches.open(C);
      try { const res = await timeout(fetch(r), 6000); if (res.ok) c.put(u.pathname, res.clone()); return res; }
      catch { return (await c.match(u.pathname)) || (await c.match("/")) || fetch(r); }
    })());
    return;
  }
  if (BUILT.test(u.pathname)) {
    e.respondWith((async () => {
      const c = await caches.open(C), hit = await c.match(r);
      if (hit) return hit;
      const res = await fetch(r); if (res.ok) { await c.put(r, res.clone()); trim(c); } return res;
    })());
    return;
  }
  if (DATA.test(u.pathname)) {
    e.respondWith((async () => {
      const c = await caches.open(C), hit = await c.match(r);
      const fresh = fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; }).catch(() => null);
      if (hit) { e.waitUntil(fresh); return hit; }
      return (await fresh) || Response.error();
    })());
  }
});
