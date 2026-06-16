const CACHE_NAME = 'menu-json-editor-v1';
const SHELL_ASSETS = ['./', './index.html', './favicon.svg', './manifest.webmanifest'];

self.addEventListener('install', event => {
  event.waitUntil(cacheAppShell());
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => caches.delete(cacheName))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(event.request));
    return;
  }

  event.respondWith(cacheFirstSameOrigin(event.request));
});

async function cacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(SHELL_ASSETS);

  const response = await fetch('./');
  if (!response.ok) return;

  const html = await response.clone().text();
  await cache.put('./index.html', response.clone());
  const assetUrls = [...html.matchAll(/(?:href|src)="(\.\/[^"#?]+)(?:[?#][^"]*)?"/g)]
    .map(match => match[1])
    .filter(url => !url.endsWith('.webmanifest'));
  await Promise.all([...new Set(assetUrls)].map(async url => {
    try {
      const assetResponse = await fetch(url);
      if (assetResponse.ok) await cache.put(url, assetResponse);
    } catch (cacheError) {
      // Keep install resilient when one non-critical local asset is unavailable.
    }
  }));
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
      await cache.put('./index.html', response.clone());
    }
    return response;
  } catch (networkError) {
    return await cache.match(request)
      || await cache.match('./index.html')
      || await cache.match('./');
  }
}

async function cacheFirstSameOrigin(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) return cachedResponse;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}
