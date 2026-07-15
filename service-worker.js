const CACHE_NAME = "mithril-mobile-m38-13-image-theme-assets-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./shot_diagram_m38.html",
  "./shot_diagram_m34.html",
  "./mithril-menu-m3813.js",
  "./mithril-update.js",
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
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

function shouldPatchHTML(requestUrl) {
  const path = requestUrl.pathname;
  return path.endsWith("/") ||
    path.endsWith("/index.html") ||
    path.endsWith("/shot_diagram_m38.html");
}

function patchHTMLResponse(response, requestUrl) {
  if (!response || !shouldPatchHTML(requestUrl)) return Promise.resolve(response);

  return response.text().then(html => {
    let patched = html.replace(/m38\.\d+/g, "m38.13");
    patched = patched.replace(/<script[^>]+mithril-menu-m389\.js[^>]*><\/script>/gi, "");
    patched = patched.replace(/<script[^>]+mithril-menu-m3810\.js[^>]*><\/script>/gi, "");
    patched = patched.replace(/<script[^>]+mithril-menu-m3811\.js[^>]*><\/script>/gi, "");
    patched = patched.replace(/<script[^>]+mithril-menu-m3812\.js[^>]*><\/script>/gi, "");
    patched = patched.replace(/<script[^>]+mithril-menu-m3813\.js[^>]*><\/script>/gi, "");
    const scriptTag = '<script src="./mithril-menu-m3813.js?v=38.13"></script>';
    if (/<\/body>/i.test(patched)) patched = patched.replace(/<\/body>/i, scriptTag + "</body>");
    else patched += scriptTag;

    const headers = new Headers(response.headers);
    headers.set("Content-Type", "text/html; charset=utf-8");
    headers.delete("Content-Length");

    return new Response(patched, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  });
}

function getNavigationResponse(request, requestUrl) {
  return fetch(request)
    .then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      return patchHTMLResponse(response, requestUrl);
    })
    .catch(() =>
      caches.match(request)
        .then(cached => cached || caches.match("./index.html"))
        .then(response => patchHTMLResponse(response, requestUrl))
    );
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
    event.respondWith(getNavigationResponse(event.request, requestUrl));
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
