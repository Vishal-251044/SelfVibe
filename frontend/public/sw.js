/**
 * SelfVibe service worker (PRD PWA-3, roadmap Day 5).
 * - App shell: pages are network-first, and a copy is kept so the installed
 *   app still opens without a connection; with no copy, /offline.html is shown.
 * - Next.js build files (/_next/static, includes the self-hosted fonts) are
 *   versioned by hash, so they are cache-first.
 * - Icons and the manifest: cached, refreshed in the background.
 * - Never cached: the API (/api) and audio (streamed with range requests).
 * Bump CACHE_VERSION to drop old caches after a big change.
 */
const CACHE_VERSION = "v2";
const SHELL_CACHE = `selfvibe-shell-${CACHE_VERSION}`;
const STATIC_CACHE = `selfvibe-static-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html"; // self-contained page (no app JavaScript needed)
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("selfvibe-") && ![SHELL_CACHE, STATIC_CACHE].includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

/**
 * Network first; on failure use the cached page, else the offline screen.
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function handleNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) ?? (await cache.match(OFFLINE_URL)) ?? Response.error();
  }
}

/**
 * Cache first (hashed build files never change).
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function handleStatic(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

/**
 * Serve the cached copy now, refresh it in the background.
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function handleStaleWhileRevalidate(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);
  const refresh = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached ?? refresh;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || request.headers.has("range")) return; // live data / audio

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
  } else if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(handleStatic(request));
  } else if (
    url.pathname.startsWith("/icons/") ||
    ["/manifest.webmanifest", "/icon.svg", "/apple-icon.png"].includes(url.pathname)
  ) {
    event.respondWith(handleStaleWhileRevalidate(request));
  }
});
