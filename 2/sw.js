'use strict';
const CACHE_PREFIX='ipapplus-static-';
const CACHE_VERSION=CACHE_PREFIX+'v1';
// Only immutable branding/font resources; never HTML, scripts, repository data or audio.
const STATIC_ASSETS=['26.ttf','icon-192.png','icon-512.png','apple-touch-icon.png','favicon.png']
  .map(path=>new URL(path,self.registration.scope).href);
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_VERSION).then(cache=>cache.addAll(STATIC_ASSETS)));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys
    .filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE_VERSION)
    .map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  // Bypass without respondWith: the browser handles direct downloads and live data.
  if(/(?:\.|%2e)deb$/i.test(url.pathname)||request.method!=='GET'||
    url.origin!==self.location.origin||request.mode==='navigate'||
    !STATIC_ASSETS.includes(url.href))return;
  event.respondWith(caches.open(CACHE_VERSION).then(cache=>cache.match(request))
    .then(cached=>cached||fetch(request)));
});
