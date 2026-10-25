importScripts('./_player/audio-store.js');
const ROOT = new URL('./', self.location.href);
const PREFIX = `media-player:${ROOT.pathname}:`;
const CACHE = PREFIX + '__BUILD__';
// Deliberately outside the versioned shell prefix: deployment never removes audio.
const AUDIO = `diwan-audio:${ROOT.pathname}:v1`;
const SHELL = ['./', 'index.html', 'manifest.webmanifest', '_player/style.css', '_player/app.js',
  '_player/icons.js', '_player/notifications.js', '_player/volume.js', '_player/format.js', '_player/control-hints.js', '_player/environment.js', '_player/media-actions.js',
  '_player/offline.js', '_player/audio-store.js', '_player/appearance.js', '_player/install.js',
  '_player/queue.js', '_player/library-view.js', '_player/library.json', '_player/icon.svg',
  '_player/icon-192.png', '_player/icon-512.png', '_player/heritage-desert.webp',
  '_player/fonts/Amiri-Regular.ttf', '_player/fonts/NotoSansArabic-Regular.ttf',
  '_player/fonts/NotoSansArabic-SemiBold.ttf'].map(p => new URL(p, ROOT).href);
const store=new DiwanOffline.AudioStore({name:AUDIO,notify:message=>{
  self.clients.matchAll({includeUncontrolled:true,type:'window'}).then(clients=>{
    for(const client of clients)if(client.url.startsWith(ROOT.href))client.postMessage({type:'DIWAN_AUDIO',...message});
  });
}});
let index;
async function readLibrary() {
  const cache=await caches.open(CACHE), response=await cache.match(new URL('_player/library.json',ROOT).href);
  if(!response)throw Error('Library unavailable');
  const manifest=await response.json();
  return new Map(manifest.tracks.map(track=>{const url=new URL(track.url,ROOT).href;return[url,{...track,url}];}));
}
function library(){return index ||= readLibrary().catch(error=>{index=null;throw error;});}
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message',event=>{
  if(event.data?.type!=='DIWAN_AUDIO_COMMAND' || !event.source?.url?.startsWith(ROOT.href))return;
  const port=event.ports[0];
  event.waitUntil((async()=>{
    try {
      const {command,url}=event.data;
      let result;
      if(command==='LIST'){
        result=await store.list();
        const shell=await caches.open(CACHE);
        result.shellReady=(await Promise.all(SHELL.map(url=>shell.match(url)))).every(Boolean);
      }
      else if(command==='CLEAR'){await store.clear();result={};}
      else if(command==='REMOVE'){
        if(typeof url!=='string'||!url.startsWith(ROOT.href))throw Error('Invalid URL');
        await store.remove(url);result={};
      } else if(command==='SAVE'){
        const track=(await library()).get(url);if(!track)throw Error('Unknown track');
        const saved=await store.save(track);result={state:saved.state};
        port?.postMessage({ok:true,result});await saved.done;return;
      } else throw Error('Unknown command');
      port?.postMessage({ok:true,result});
    } catch {port?.postMessage({ok:false});}
  })());
});
self.addEventListener('fetch', event => {
  const request=event.request,url=new URL(request.url);url.hash='';
  if(!['GET','HEAD'].includes(request.method)||url.origin!==ROOT.origin||!url.href.startsWith(ROOT.href))return;
  if(request.method==='GET'&&SHELL.includes(url.href)){
    event.respondWith(fetch(request).then(response=>{
      if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(async cache=>{await cache.put(url.href,copy);if(url.href===new URL('_player/library.json',ROOT).href)index=null;}));}
      return response;
    }).catch(()=>caches.open(CACHE).then(cache=>cache.match(url.href)).then(response=>response||Response.error())));
    return;
  }
  // Only manifest audio (or a previously verified saved entry) can enter this store.
  let release;
  const lifetime=new Promise(resolve=>{release=resolve;});event.waitUntil(lifetime);
  event.respondWith((async()=>{
    try {
      const track=(await library()).get(url.href);
      let work;
      const response=await store.serve(request,track,promise=>{work=promise;});
      if(work)work.finally(release);else release();
      return response;
    } catch {
      release();
      // Storage/index failures must not prevent ordinary online playback.
      try{return await fetch(request);}catch{return new Response('المقطع غير محفوظ دون إنترنت. اتصل بالإنترنت وأعد المحاولة.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});}
    }
  })());
});
