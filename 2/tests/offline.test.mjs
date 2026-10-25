import test from 'node:test';
import assert from 'node:assert/strict';
import '../web/_player/audio-store.js';
const {AudioStore,cachedResponse}=globalThis.DiwanOffline;
class MemoryStorage {
  stores=new Map();
  async open(name){
    if(!this.stores.has(name))this.stores.set(name,new Map());const map=this.stores.get(name);
    return {match:async key=>map.get(typeof key==='string'?key:key.url)?.clone(),
      put:async(key,response)=>{map.set(typeof key==='string'?key:key.url,new Response(await response.arrayBuffer(),{status:response.status,headers:response.headers}));},
      keys:async()=>[...map.keys()].map(url=>new Request(url)),delete:async key=>map.delete(typeof key==='string'?key:key.url)};
  }
}
const bytes=Uint8Array.from({length:512},(_,i)=>i%256);
const track={id:'files/قصائد/١.mp3',url:'https://example.test/media/files/%D9%82%D8%B5%D8%A7%D8%A6%D8%AF/1.mp3',title:'١',folder:'files/قصائد',bytes:bytes.length,mime:'audio/mpeg'};
function fixture(network=async()=>new Response(bytes,{headers:{'Content-Length':String(bytes.length)}})){
  const storage=new MemoryStorage(),states=[];
  const store=new AudioStore({name:'audio:/media/:v1',storage,network,notify:message=>states.push(message)});
  return {store,storage,states};
}
test('complete verified copies are persistent, avoid another transfer, and are independent from shell storage',async()=>{
  let calls=0;const {store,storage,states}=fixture(async()=>{calls++;return new Response(bytes);});
  const shell=await storage.open('shell:version');await shell.put('https://example.test/media/',new Response('shell'));
  const result=await store.save(track);await result.done;
  assert.equal(states.at(-1).state,'saved');assert.equal((await store.list()).entries[0].bytes,bytes.length);
  const reopened=new AudioStore({name:store.name,storage,network:async()=>{throw Error('offline');}});
  assert.deepEqual(new Uint8Array(await (await reopened.serve(new Request(track.url),track)).arrayBuffer()),bytes);
  await store.save(track);assert.equal(calls,1);
  await reopened.remove(track.url);assert.equal((await reopened.list()).entries.length,0);
  await store.save(track);await store.jobs.get(track.url)?.done;await store.clear();
  assert.equal((await store.list()).entries.length,0);assert.equal(await(await shell.match('https://example.test/media/')).text(),'shell');
});
test('cached responses implement full, bounded, open-ended, suffix, clamped and HEAD byte requests',async()=>{
  const {store}=fixture();await(await store.save(track)).done;
  for(const [range,start,end,status]of [[null,0,511,200],['bytes=0-1',0,1,206],['bytes=17-38',17,38,206],['bytes=500-',500,511,206],['bytes=-7',505,511,206],['bytes=-9999',0,511,206],['bytes=500-9999',500,511,206]]){
    const request=new Request(track.url,{headers:range?{Range:range}:{}}),response=await store.serve(request,track);
    assert.equal(response.status,status);assert.equal(response.headers.get('Content-Type'),'audio/mpeg');
    assert.equal(Number(response.headers.get('Content-Length')),end-start+1);assert.equal(response.headers.get('Accept-Ranges'),'bytes');
    assert.equal(response.headers.get('Content-Range'),range?`bytes ${start}-${end}/512`:null);
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()),bytes.slice(start,end+1));
  }
  const head=await cachedResponse(new Request(track.url,{method:'HEAD',headers:{Range:'bytes=2-6'}}),await store.entry(track.url));
  assert.equal(head.status,206);assert.equal(head.headers.get('Content-Length'),'5');assert.equal((await head.arrayBuffer()).byteLength,0);
});
test('malformed, unsatisfiable, reversed, zero suffix and multiple ranges return 416',async()=>{
  const {store}=fixture();await(await store.save(track)).done;
  for(const Range of ['bytes=512-','bytes=8-2','bytes=-0','bytes=-','bytes=0-1,4-5','items=1-2','bytes=abc','bytes=999999999999999999999-']){
    const response=await store.serve(new Request(track.url,{headers:{Range}}),track);
    assert.equal(response.status,416,Range);assert.equal(response.headers.get('Content-Range'),'bytes */512');
    assert.equal(response.headers.get('Content-Length'),'0');assert.equal((await response.arrayBuffer()).byteLength,0);
  }
});
test('partial HTTP responses, wrong declared lengths, truncated bodies and interrupted streams are never saved',async()=>{
  for(const response of [new Response(bytes,{status:206,headers:{'Content-Range':'bytes 0-511/512'}}),
    new Response(bytes,{headers:{'Content-Length':'999'}}),new Response(bytes.slice(0,10)),
    new Response(new ReadableStream({start(c){c.enqueue(bytes.slice(0,10));c.error(Error('Interrupted'));}}))]){
    const {store,states}=fixture(async()=>response);
    await(await store.save(track)).done;assert.equal((await store.list()).entries.length,0);
    assert.equal(states.at(-1).state,'failed');assert.ok(!states.some(s=>s.state==='saved'));
  }
});
test('one full network transfer serves simultaneous ranges and save requests while playback streams promptly',async()=>{
  let release,calls=0;const gate=new Promise(resolve=>{release=resolve;});
  const {store,states}=fixture(async()=>{calls++;return new Response(new ReadableStream({async start(c){c.enqueue(bytes.slice(0,2));await gate;c.enqueue(bytes.slice(2));c.close();}}));});
  const requests=await Promise.all([store.serve(new Request(track.url,{headers:{Range:'bytes=0-1'}}),track),store.serve(new Request(track.url,{headers:{Range:'bytes=2-'}}),track),store.save(track)]);
  assert.deepEqual(new Uint8Array(await requests[0].arrayBuffer()),bytes.slice(0,2));
  assert.equal(states.at(-1).state,'saving');assert.equal((await store.list()).entries.length,0);
  release();assert.deepEqual(new Uint8Array(await requests[1].arrayBuffer()),bytes.slice(2));await requests[2].done;
  assert.equal(calls,1);assert.equal((await store.list()).entries.length,1);
});
test('quota failures report failed saving while the online playback body remains intact',async()=>{
  const {store,storage,states}=fixture();const open=storage.open.bind(storage);
  storage.open=async name=>({...await open(name),put:async()=>{throw new DOMException('Full','QuotaExceededError');}});
  const response=await store.serve(new Request(track.url),track);await store.jobs.get(track.url)?.done;
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()),bytes);
  assert.equal(states.at(-1).code,'quota');assert.equal((await store.list()).entries.length,0);
});
test('clearing during a download prevents late writes without interrupting its playback stream',async()=>{
  let release;const gate=new Promise(resolve=>{release=resolve;});
  const {store}=fixture(async()=>new Response(new ReadableStream({async start(c){c.enqueue(bytes.slice(0,2));await gate;c.enqueue(bytes.slice(2));c.close();}})));
  const response=await store.serve(new Request(track.url),track),job=store.jobs.get(track.url);
  await store.clear();release();await job.done;
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()),bytes);assert.equal((await store.list()).entries.length,0);
});

test('servers that return only partial data fall back to normal ranged online playback',async()=>{
  let calls=0;
  const {store}=fixture(async request=>{
    calls++;
    if(typeof request==='string')return new Response(bytes.slice(0,2),{status:206,headers:{'Content-Range':'bytes 0-1/512'}});
    assert.equal(request.headers.get('Range'),'bytes=2-5');
    return new Response(bytes.slice(2,6),{status:206,headers:{'Content-Range':'bytes 2-5/512'}});
  });
  const response=await store.serve(new Request(track.url,{headers:{Range:'bytes=2-5'}}),track);
  assert.equal(response.status,206);assert.deepEqual(new Uint8Array(await response.arrayBuffer()),bytes.slice(2,6));
  assert.equal((await store.list()).entries.length,0);assert.equal(calls,2);
});

test('worker storage/index failures preserve ordinary network playback and its Range header',async()=>{
  const {readFile}=await import('node:fs/promises'),{runInNewContext}=await import('node:vm');
  const listeners=new Map(),request=new Request(track.url,{headers:{Range:'bytes=2-5'}});
  const cacheError=new DOMException('Storage blocked','QuotaExceededError');let response,calls=0;
  const context={importScripts:()=>{},DiwanOffline:globalThis.DiwanOffline,URL,Headers,Response,Promise,
    caches:{open:async()=>{throw cacheError;}},fetch:async original=>{assert.equal(original,request);calls++;return new Response(bytes.slice(2,6),{status:206});},
    self:{location:{href:'https://example.test/media/sw.js'},addEventListener:(type,listener)=>listeners.set(type,listener)}};
  runInNewContext(await readFile(new URL('../web/sw.js',import.meta.url),'utf8'),context);
  const tasks=[];listeners.get('fetch')({request,waitUntil:promise=>tasks.push(promise),respondWith:promise=>{response=promise;}});
  const result=await response;assert.equal(result.status,206);assert.equal(calls,1);await Promise.all(tasks);
});
