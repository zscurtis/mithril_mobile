const CACHE_NAME = "mithril-mobile-m41-0-jobs-database-v1";
const JOBS_SCRIPT = "./mithril-jobs-m410.js?v=41.0.0";
const APP_SHELL = [
  "./",
  "./index.html",
  "./shot_diagram_m38.html",
  "./shot_diagram_m34.html",
  "./mithril-update.js",
  "./mithril-core-m400.js",
  "./mithril-jobs-m410.js",
  "./manifest.webmanifest",
  "./icons/mithril-192.png",
  "./icons/mithril-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

function injectJobsScript(response) {
  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html")) return Promise.resolve(response);
  return response.text().then(html => {
    if (html.includes("mithril-jobs-m410.js")) {
      return new Response(html, { status: response.status, statusText: response.statusText, headers: response.headers });
    }
    const tag = '<script src="' + JOBS_SCRIPT + '"></script>';
    const injected = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, tag + "\n</body>") : html + tag;
    const headers = new Headers(response.headers);
    headers.delete("content-length");
    return new Response(injected, { status: response.status, statusText: response.statusText, headers });
  });
}

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);

  if (requestUrl.pathname.endsWith("/version.json")) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .catch(() => new Response(JSON.stringify({ offline: true }), {
          status: 503,
          headers: { "Content-Type": "application/json" }
        }))
    );
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const cacheCopy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cacheCopy));
          return injectJobsScript(response);
        })
        .catch(() => caches.match(event.request)
          .then(cached => cached || caches.match("./index.html"))
          .then(injectJobsScript))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === "opaque") return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      });
    })
  );
});