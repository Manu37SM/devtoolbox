/**
 * DevToolbox service worker — hand-rolled (no Workbox/next-pwa), per
 * CLAUDE.md's "flag new deps before adding" rule: PWA/offline support
 * (FEATURE.md's Cross-Cutting Platform Features, P1) doesn't need a
 * toolkit, just the platform Cache API, so we don't take on a dependency
 * for it.
 *
 * This file is plain JS and is NOT part of the Next.js/webpack build — it's
 * served as-is from `frontend/public/sw.js` (i.e. `/sw.js`) and registered
 * directly by `components/pwa/ServiceWorkerRegistration.tsx`. Don't import
 * anything here; it runs in the service worker global scope, not a module
 * graph.
 *
 * CACHE VERSIONING: bump CACHE_NAME (e.g. "devtoolbox-v2") on every deploy
 * that changes cached assets/routes. The `activate` handler below deletes
 * any cache whose name doesn't match the current CACHE_NAME, so bumping
 * the string is what actually invalidates old precached content — there's
 * no other cache-busting mechanism here by design (keeps this file simple
 * and dependency-free). Forgetting to bump it just means users keep
 * getting stale precached shell/tool pages until those specific URLs are
 * revalidated via the stale-while-revalidate fetch handler, so it's not
 * catastrophic — but bump it when app-shell-critical files change.
 */
const CACHE_NAME = "devtoolbox-v1";

// App shell + a handful of representative, high-traffic tool pages.
// This is NOT the full tool catalog (see frontend/src/lib/registry.ts for
// that) — precaching all 50+ tool routes on install would be slow and
// wasteful. Every other tool page still gets cached opportunistically the
// first time a user visits it, via the stale-while-revalidate fetch
// handler below; this list just guarantees a useful offline experience
// immediately after first install.
const PRECACHE_URLS = [
  "/",
  "/manifest.json",
  "/tools/json-formatter",
  "/tools/base64",
  "/tools/hash-generator",
  "/tools/uuid-generator",
  "/tools/jwt-decoder",
  "/tools/regex-tester",
  "/tools/unix-timestamp",
  "/tools/css-beautifier",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      // Activate this worker immediately instead of waiting for all tabs
      // running the previous version to close — standard "update ASAP"
      // choice for a tool site where staleness (not mid-session disruption)
      // is the bigger risk.
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle same-origin GET requests. Cross-origin requests (e.g. a
  // font CDN) and non-GET requests (POST/PUT/etc — none of our tools make
  // these for their core transforms per CLAUDE.md rule 1, but some
  // third-party script might) are left to the network untouched: caching
  // them could serve stale or unauthorized-looking responses we have no
  // business intercepting.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(staleWhileRevalidate(request));
});

/**
 * Stale-while-revalidate: return the cached response immediately if one
 * exists (fast, works offline), while kicking off a network fetch in the
 * background to refresh the cache for next time. If there's no cached
 * response, fall through to the network and cache what comes back.
 *
 * If the network fails entirely and nothing is cached:
 *   - for a page navigation, fall back to the cached "/" app shell so the
 *     user gets *something* instead of the browser's offline error page.
 *   - for any other request (an asset, a data fetch), just let it fail —
 *     synthesizing a fake response for e.g. a missing script would be
 *     worse than a clear failure.
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  const networkFetch = fetch(request)
    .then((networkResponse) => {
      // Only cache successful, basic (same-origin, non-opaque) responses.
      if (networkResponse && networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => undefined);

  if (cachedResponse) {
    // Serve the cached copy now; let the network update run in the
    // background without blocking the response.
    networkFetch;
    return cachedResponse;
  }

  const networkResponse = await networkFetch;
  if (networkResponse) return networkResponse;

  // Network failed and nothing was cached for this exact request. For
  // page navigations, fall back to the cached app shell ("/") rather than
  // surfacing a hard failure — this is what makes the app feel "offline
  // capable" instead of just "offline broken."
  if (request.mode === "navigate") {
    const shell = await cache.match("/");
    if (shell) return shell;
  }

  // No cache, no network, nothing sensible to fall back to — let the
  // browser's normal network-error handling take over.
  return Response.error();
}
