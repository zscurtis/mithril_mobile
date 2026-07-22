const CACHE_NAME = "mithril-mobile-m39-7-timing-sequence-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./shot_diagram_m38.html",
  "./shot_diagram_m34.html",
  "./mithril-menu-m397.js",
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

// Only the home document and Shot Diagram wrapper receive the release helper.
// IMPORTANT: index.html contains the Drill Log template as an embedded base64 PNG.
// Never run a broad version-number replacement over the full HTML string because
// ordinary base64 characters can contain text such as "m39" and be corrupted.
function shouldPatchHTML(requestUrl) {
  const path = requestUrl.pathname;
  return path.endsWith("/") ||
    path.endsWith("/index.html") ||
    path.endsWith("/shot_diagram_m38.html");
}

function patchHTMLResponse(response, requestUrl) {
  if (!response || !shouldPatchHTML(requestUrl)) return Promise.resolve(response);

  return response.text().then(html => {
    // Version labels are updated safely at runtime by mithril-menu-m397.js.
    // Here we modify script tags only and leave all embedded data untouched.
    let patched = html.replace(
      /<script[^>]+mithril-menu-m(?:38\d+|39\d+)\.js[^>]*><\/script>/gi,
      ""
    );

    const scriptTag = '<script src="./mithril-menu-m397.js?v=39.7"></script>';
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
