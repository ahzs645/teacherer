/* Teacherer service worker: precache the whole app so it works fully offline.
 * Bump CACHE_VERSION whenever any precached file changes.
 */
var CACHE_VERSION = "teacherer-v1.0.0";
var PRECACHE = [
  "./",
  "index.html",
  "styles.css",
  "app.js",
  "seed-data.js",
  "manifest.webmanifest",
  "vendor/xlsx.full.min.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function (cache) {
      return cache.addAll(PRECACHE);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) {
        return k !== CACHE_VERSION;
      }).map(function (k) {
        return caches.delete(k);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

/* Cache-first for same-origin GETs, refreshing the cache in the background
 * so a deployed update is picked up on the next visit. */
self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (cached) {
      var refresh = fetch(req).then(function (resp) {
        if (resp && resp.ok) {
          var copy = resp.clone();
          caches.open(CACHE_VERSION).then(function (cache) { cache.put(req, copy); });
        }
        return resp;
      }).catch(function () { return cached; });
      return cached || refresh;
    })
  );
});
