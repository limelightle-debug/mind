// Offline shell; the page and the data are always fetched fresh when online. Bump CACHE when the app files change.
// Fetch by URL, not with the request itself: a page navigation can't be re-sent with options, and doing so used to fall
// through to the cached (old) page, so updates never showed.
const CACHE = "mind-v30";
const SHELL = ["./", "index.html", "engine.js", "calendar.js", "words.js", "manifest.webmanifest", "icons/icon-192.png"];
const fresh = req => fetch(req.url, { cache: "no-cache", credentials: "same-origin" });
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(fresh(e.request).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match(e.request).then(r => r || caches.match("index.html"))));
});
