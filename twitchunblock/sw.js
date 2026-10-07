// Service worker minimal : le site s'installe comme une app, et la coque
// (HTML, CSS, JS) s'ouvre même hors ligne. Réseau d'abord, toujours : une
// mise à jour du site est servie dès qu'elle est en ligne, le cache ne sert
// que de secours. Rien d'autre que nos propres fichiers n'est mis en cache.
const PREFIX = 'twitchunblock-ipapplus-shell-'
const BASE = new URL(self.registration.scope)
const CACHE = PREFIX + encodeURIComponent(BASE.pathname) + '-v3'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith(PREFIX) && k !== CACHE) await caches.delete(k)
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin || req.headers.has('Authorization')) return
  if (!url.pathname.startsWith(BASE.pathname)) return
  const path = url.pathname.slice(BASE.pathname.length)
  if (!['', 'index.html', 'config.js', 'manifest.webmanifest'].includes(path) && !/^assets\/.*\.(?:js|css|png|svg|woff2?|ttf)$/.test(path)) return
  e.respondWith((async () => {
    try {
      const res = await fetch(req)
      if (res.ok && res.type === 'basic') {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {})
      }
      return res
    } catch {
      const hit = await caches.match(req) ?? (req.mode === 'navigate' ? await caches.match(BASE.href) : null)
      return hit ?? Response.error()
    }
  })())
})
