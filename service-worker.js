const CACHE_NAME = "mithril-mobile-m38-10-shot-recovery-wheel-zoom-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./shot_diagram_m38.html",
  "./shot_diagram_m34.html",
  "./mithril-menu-m3810.js",
  "./mithril-update.js",
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
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

// Only the small home and wrapper documents are patched. The large stable
// Shot Diagram engine is served unchanged so its embedded template image and
// application script never pass through an HTML rewriting step.
function shouldPatchHTML(requestUrl) {
  const path = requestUrl.pathname;
  return path.endsWith("/") ||
    path.endsWith("/index.html") ||
    path.endsWith("/shot_diagram_m38.html");
}

function patchHTMLResponse(response, requestUrl) {
  if (!response || !shouldPatchHTML(requestUrl)) return Promise.resolve(response);

  return response.text().then(html => {
    let patched = html.replace(/m38\.(?:8|9)/g, "m38.10");
    patched = patched.replace(/<script[^>]+mithril-menu-m389\.js[^>]*><\/script>/gi, "");
    if (patched.indexOf("mithril-menu-m3810.js") === -1) {
      const scriptTag = '<script src="./mithril-menu-m3810.js?v=38.10"></script>';
      if (/<\/body>/i.test(patched)) patched = patched.replace(/<\/body>/i, scriptTag + "</body>");
      else patched += scriptTag;
    }

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
