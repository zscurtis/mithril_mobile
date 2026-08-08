importScripts("./mithril-config.js");

const CACHE_NAME = self.MITHRIL_CONFIG.cacheName;

const APP_SHELL = [
  "./",
  "./index.html",
  "./shot_diagram_m38.html",
  "./shot_diagram_m34.html",
  "./mithril-config.js",
  "./mithril-update.js",
  "./mithril-menu.js",
  "./mithril-core.js",
  "./mithril-cloud.js",
  "./mithril-jobs.js",
  "./mithril-search.js",
  "./manifest.webmanifest",
  "./icons/mithril-192.png",
  "./icons/mithril-512.png",
  "./theme_assets/dark-slate.webp",
  "./theme_assets/blue-steel.webp",
  "./theme_assets/subtle-grid.webp",
  "./theme_assets/gradient-slate.webp",
  "./theme_assets/dark-paper.webp",
  "./theme_assets/soft-quarry-tan.webp",
  "./theme_assets/blast-ember.webp",
  "./theme_assets/electric-steel.webp",
  "./theme_assets/blast-placard.webp",
  "./theme_assets/copper-quarry.webp",
  "./theme_assets/cobalt-topo.webp",
  "./theme_assets/signal-red-slate.webp"
];

function refreshAppShell(cache) {
  return Promise.all(APP_SHELL.map(function (url) {
    return fetch(url, { cache: "reload" }).then(function (response) {
      if (!response || !response.ok) {
        throw new Error("Unable to cache " + url + ".");
      }
      return cache.put(url, response);
    });
  }));
}

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(refreshAppShell)
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (key) {
          return key.indexOf("mithril-mobile-") === 0 && key !== CACHE_NAME;
        }).map(function (key) {
          return caches.delete(key);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("message", function (event) {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

function offlineVersionResponse() {
  return new Response(JSON.stringify({ offline: true }), {
    status: 503,
    headers: { "Content-Type": "application/json" }
  });
}

function networkFirstNavigation(request) {
  return fetch(request).then(function (response) {
    if (response && response.ok) {
      var copy = response.clone();
      caches.open(CACHE_NAME).then(function (cache) { return cache.put(request, copy); });
    }
    return response;
  }).catch(function () {
    return caches.match(request).then(function (cached) {
      return cached || caches.match("./index.html");
    });
  });
}

function cacheFirst(request) {
  return caches.match(request).then(function (cached) {
    if (cached) return cached;
    return fetch(request).then(function (response) {
      if (response && response.ok && response.type !== "opaque") {
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) { return cache.put(request, copy); });
      }
      return response;
    });
  });
}

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;

  var requestUrl = new URL(event.request.url);

  if (requestUrl.pathname.endsWith("/version.json")) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" }).catch(offlineVersionResponse)
    );
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(event.request));
    return;
  }

  event.respondWith(cacheFirst(event.request));
});
