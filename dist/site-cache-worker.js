/* Manifest is generated from the published files; revisions prevent stale assets. */
importScripts('./precache-manifest.js');
const manifest = globalThis.SITE_PRECACHE;
const base = self.registration.scope;
const cacheName = 'memory-site:' + new URL(base).pathname;
const entries = new Map(manifest.files.map(file => [new URL(file.path, base).pathname, file]));
const keyFor = file => new URL(file.path + '?__revision=' + file.revision, base).href;
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('message', event => {
  if (event.data?.type === 'site-cache:version') event.ports[0]?.postMessage(manifest.version);
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (url.origin !== self.location.origin || !['GET', 'HEAD'].includes(request.method)) return;
  if (url.pathname === new URL('precache-manifest.js',base).pathname) {
    event.respondWith(fetch(request).catch(async()=>{
      const cached=await (await caches.open(cacheName)).match(new URL('precache-manifest.js',base).href);
      return cached || Response.error();
    }));
    return;
  }
  const file = entries.get(url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname);
  // Preloader downloads must reach the server, never an older cached response.
  if (!file || url.searchParams.has('__download')) return;
  event.respondWith((async () => {
    const cached = await (await caches.open(cacheName)).match(keyFor(file));
    if (!cached) return fetch(request);
    const headers = new Headers(cached.headers);
    headers.set('Accept-Ranges', 'bytes');
    if (request.method === 'HEAD') return new Response(null, {status:200, headers});
    const range = request.headers.get('Range');
    if (!range) return cached;
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) return fetch(request);
    const blob = await cached.blob(), size = blob.size;
    const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
    const end = match[1] && match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
    if (start > end || start >= size) return new Response(null, {status:416,headers:{'Content-Range':`bytes */${size}`}});
    headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
    headers.set('Content-Length', String(end - start + 1));
    return new Response(blob.slice(start, end + 1), {status:206, headers});
  })());
});
