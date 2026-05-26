/**
 * AuraPoS Service Worker — Offline-first shell caching
 *
 * Strategy:
 *  - Navigate requests: NetworkFirst (3s timeout) → serve from cache if offline
 *  - Static assets (.js/.css/.png/etc.): StaleWhileRevalidate
 *  - API GET catalog/features: NetworkFirst → cache for offline use
 *  - API POST/PATCH/DELETE: never intercepted (routed through IndexedDB outbox)
 *
 * Important: cache.put() in the Fetch handler bypasses Cache-Control headers from
 * the server. This is intentional — Vite dev server sends Cache-Control: no-store,
 * but the Service Worker Cache API stores whatever we tell it to.
 */

const CACHE_VERSION = 'aurapos-v3';
const SHELL_CACHE = CACHE_VERSION + '-shell';
const API_CACHE = CACHE_VERSION + '-api';

const NAVIGATE_TIMEOUT_MS = 4000;
const API_TIMEOUT_MS = 5000;

const SHELL_PRECACHE = ['/index.html', '/'];
const API_CACHEABLE_PATTERNS = [
  '/api/catalog/products',
  '/api/catalog/categories',
  '/api/orders/order-types',
  '/api/tenants/features',
  '/api/tables',
];

// ─── Install ──────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(SHELL_CACHE).then(async (cache) => {
      for (const path of SHELL_PRECACHE) {
        try {
          const res = await fetch(path, { credentials: 'same-origin' });
          if (res.status === 200) {
            await cache.put(path, res);
          }
        } catch {
          // Ignore — will be cached on first navigation
        }
      }
    })
  );
});

// ─── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== API_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Skip non-GET
  if (request.method !== 'GET') return;

  // ── Navigate (SPA shell) ──────────────────────────────────────────────────
  if (request.mode === 'navigate') {
    event.respondWith(navigateHandler(request));
    return;
  }

  // ── API GET caching ───────────────────────────────────────────────────────
  if (url.pathname.startsWith('/api/')) {
    const isCacheable = API_CACHEABLE_PATTERNS.some((p) =>
      url.pathname.startsWith(p)
    );
    if (isCacheable) {
      event.respondWith(networkFirstWithCache(request, API_CACHE, API_TIMEOUT_MS));
    }
    return;
  }

  // ── Static assets: stale-while-revalidate ─────────────────────────────────
  if (/\.(js|mjs|css|png|svg|woff2|ico|webmanifest|jpg|jpeg|webp|gif)$/.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function navigateHandler(request) {
  try {
    const res = await fetchWithTimeout(request, NAVIGATE_TIMEOUT_MS);
    if (res.ok) {
      const cache = await caches.open(SHELL_CACHE);
      // Force-store: bypasses Cache-Control: no-store from Vite dev server
      await forcePut(cache, request, res.clone());
    }
    return res;
  } catch {
    // Network unavailable — serve from cache
    const cache = await caches.open(SHELL_CACHE);
    const cached =
      (await cache.match(request)) ||
      (await cache.match('/index.html')) ||
      (await cache.match('/'));
    if (cached) return cached;
    // Last resort: offline fallback response
    return new Response(
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>AuraPoS Offline</title></head>' +
        '<body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#0f172a;color:#fff;flex-direction:column;gap:16px">' +
        '<p style="font-size:1.5rem">&#128268; Mode Offline</p>' +
        '<p style="color:#94a3b8">Buka dulu sekali saat online agar POS tersedia offline.</p>' +
        '<button onclick="location.reload()" style="padding:12px 24px;background:#2563eb;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:1rem">Coba Lagi</button>' +
        '</body></html>',
      {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  }
}

async function networkFirstWithCache(request, cacheName, timeoutMs) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetchWithTimeout(request, timeoutMs);
    if (res.ok) {
      await forcePut(cache, request, res.clone());
    }
    return res;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error('Network and cache both unavailable');
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then(async (res) => {
      if (res.ok) await cache.put(request, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}

function fetchWithTimeout(request, ms) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const id = setTimeout(() => {
      controller.abort();
      reject(new Error('Timeout'));
    }, ms);
    fetch(request, { signal: controller.signal })
      .then((res) => { clearTimeout(id); resolve(res); })
      .catch((err) => { clearTimeout(id); reject(err); });
  });
}

/**
 * Force-store a response in the cache, ignoring Cache-Control: no-store.
 * The Service Worker Cache API does not enforce Cache-Control — this is intentional.
 */
async function forcePut(cache, request, response) {
  try {
    // Read the body so we can create a new Response without restrictive headers
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
    const storedResponse = new Response(buffer, {
      status: response.status,
      statusText: response.statusText,
      headers: { 'Content-Type': contentType },
    });
    await cache.put(request, storedResponse);
  } catch {
    // Storage quota or other error — silently ignore
  }
}
