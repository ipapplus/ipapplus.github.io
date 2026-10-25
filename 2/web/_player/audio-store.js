/* Shared worker core, dependency-free and injectable for deterministic tests. */
(() => {
  function byteRange(value, length) {
    if (!value) return {start:0,end:length-1,partial:false};
    const match = /^bytes=(\d*)-(\d*)$/i.exec(value.trim());
    if (!match || (!match[1] && !match[2]) || !length) return null;
    let start, end;
    if (!match[1]) {
      const suffix = Number(match[2]);
      if (!Number.isSafeInteger(suffix) || suffix <= 0) return null;
      start = Math.max(0,length-suffix); end = length-1;
    } else {
      start = Number(match[1]); end = match[2] ? Number(match[2]) : length-1;
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= length || end < start) return null;
      end = Math.min(end,length-1);
    }
    return {start,end,partial:true};
  }
  function responseHeaders(length, mime, range) {
    const headers = new Headers({'Content-Type':mime,'Accept-Ranges':'bytes','Content-Length':String(range ? range.end-range.start+1 : 0)});
    if (!range) headers.set('Content-Range',`bytes */${length}`);
    else if (range.partial) headers.set('Content-Range',`bytes ${range.start}-${range.end}/${length}`);
    return headers;
  }
  async function cachedResponse(request, cached) {
    const blob = await cached.blob(), range = byteRange(request.headers.get('Range'),blob.size);
    const headers = responseHeaders(blob.size,cached.headers.get('Content-Type') || blob.type,range);
    if (!range) return new Response(null,{status:416,headers});
    return new Response(request.method === 'HEAD' ? null : blob.slice(range.start,range.end+1), {status:range.partial ? 206 : 200,headers});
  }
  class AudioStore {
    constructor({name,storage=globalThis.caches,network=globalThis.fetch.bind(globalThis),notify=()=>{}}) {
      this.name=name; this.storage=storage; this.network=network; this.notify=notify;
      this.jobs=new Map(); this.excluded=new Set(); this.clearing=false;
    }
    valid(response) {
      const bytes=Number(response?.headers.get('X-Diwan-Complete'));
      return response?.status===200 && !response.headers.has('Content-Range') && bytes>0 && bytes===Number(response.headers.get('Content-Length'));
    }
    async entry(url) {
      try { const entry=await (await this.storage.open(this.name)).match(url); return this.valid(entry) ? entry : null; }
      catch { return null; } // Restricted storage must never block online playback.
    }
    announce(url,state,code='') { this.notify({url,state,code}); }
    async list() {
      const cache=await this.storage.open(this.name), entries=[];
      for (const request of await cache.keys()) {
        const response=await cache.match(request); if (!this.valid(response)) continue;
        let track;
        try { track=JSON.parse(decodeURIComponent(response.headers.get('X-Diwan-Track'))); } catch { continue; }
        entries.push({url:request.url,bytes:Number(response.headers.get('X-Diwan-Complete')),track,state:'saved'});
      }
      return {entries,pending:[...this.jobs].filter(([,job])=>!job.cancelled).map(([url])=>({url,state:'saving'}))};
    }
    start(track) {
      if (this.jobs.has(track.url)) return this.jobs.get(track.url);
      const job={chunks:[],loaded:0,ended:false,error:null,cancelled:false,put:null};
      job.changed=new Promise(resolve=>{job.wake=resolve;});
      const signal=()=>{job.wake();job.changed=new Promise(resolve=>{job.wake=resolve;});};
      let ready,fail;
      job.ready=new Promise((resolve,reject)=>{ready=resolve;fail=reject;});
      job.ready.catch(()=>{});
      this.jobs.set(track.url,job); this.announce(track.url,'saving');
      job.done=(async()=>{
        try {
          const response=await this.network(track.url,{cache:'no-store',headers:{Accept:track.mime}});
          // A 206, opaque response, or unexpectedly sized representation is never a full copy.
          if (response.status!==200 || response.headers.has('Content-Range') || !response.body) throw new Error('incomplete');
          const length=response.headers.get('Content-Length');
          if (length!==null && Number(length)!==track.bytes) throw new Error('incomplete');
          ready();
          const reader=response.body.getReader();
          try {
            while (true) {
              const {done,value}=await reader.read(); if (done) break;
              if (job.loaded+value.byteLength>track.bytes) throw new Error('incomplete');
              job.chunks.push({offset:job.loaded,data:value});job.loaded+=value.byteLength;signal();
            }
          } catch (error) { await reader.cancel().catch(()=>{}); throw error; }
          if (job.loaded!==track.bytes) throw new Error('incomplete');
          job.ended=true;signal();
          const blob=new Blob(job.chunks.map(chunk=>chunk.data),{type:track.mime});
          if (blob.size!==track.bytes) throw new Error('incomplete');
          const cache=await this.storage.open(this.name);
          if (job.cancelled) return;
          const headers={'Content-Type':track.mime,'Content-Length':String(blob.size),'Accept-Ranges':'bytes',
            'X-Diwan-Complete':String(blob.size),'X-Diwan-Track':encodeURIComponent(JSON.stringify(track))};
          // Cache.put is atomic; only a completely received and size-verified Blob enters it.
          job.put=cache.put(track.url,new Response(blob,{status:200,headers}));
          await job.put;
          if (!job.cancelled) this.announce(track.url,'saved');
        } catch (error) {
          if (!job.ended) {job.error=error;fail(error);}
          if (!job.cancelled) this.announce(track.url,'failed',error.name==='QuotaExceededError' ? 'quota' : 'download');
        } finally {job.ended=true;signal();if(this.jobs.get(track.url)===job)this.jobs.delete(track.url);}
      })();
      return job;
    }
    async save(track) {
      this.excluded.delete(track.url);
      if (this.clearing) return {state:'failed'};
      if (await this.entry(track.url)) {this.announce(track.url,'saved');return {state:'saved'};}
      const existing=this.jobs.get(track.url);
      if (existing) existing.cancelled=false;
      const job=this.start(track);return {state:'saving',done:job.done};
    }
    async serve(request,track,hold=()=>{}) {
      const cached=await this.entry(request.url);
      if (cached) return cachedResponse(request,cached);
      if (!track || this.excluded.has(request.url) || this.clearing || request.method==='HEAD') return this.network(request);
      const range=byteRange(request.headers.get('Range'),track.bytes);
      if (!range) return new Response(null,{status:416,headers:responseHeaders(track.bytes,track.mime,null)});
      const job=this.start(track);hold(job.done);
      try {await job.ready;} catch {return this.network(request);}
      let cursor=range.start, index=0;
      const body=new ReadableStream({
        async pull(controller) {
          while (cursor<=range.end) {
            if (job.error) {controller.error(job.error);return;}
            while (index<job.chunks.length && job.chunks[index].offset+job.chunks[index].data.byteLength<=cursor) index++;
            const chunk=job.chunks[index];
            if (chunk && chunk.offset<=cursor) {
              const part=chunk.data.subarray(cursor-chunk.offset,Math.min(chunk.data.byteLength,range.end+1-chunk.offset));
              cursor+=part.byteLength;controller.enqueue(part);
              if(cursor>range.end)controller.close();return;
            }
            if(job.ended){controller.error(new Error('Incomplete audio'));return;}
            await job.changed;
          }
          controller.close();
        },
      });
      return new Response(body,{status:range.partial ? 206 : 200,headers:responseHeaders(track.bytes,track.mime,range)});
    }
    async remove(url) {
      this.excluded.add(url);
      const job=this.jobs.get(url);
      // Keep an active playback stream alive, but prevent a late cache write.
      if(job){job.cancelled=true;await job.put?.catch(()=>{});}
      await (await this.storage.open(this.name)).delete(url);this.announce(url,'removed');
    }
    async clear() {
      this.clearing=true;
      try {
        for(const [url,job] of this.jobs){this.excluded.add(url);job.cancelled=true;}
        await Promise.all([...this.jobs.values()].map(job=>job.put?.catch(()=>{})));
        const cache=await this.storage.open(this.name);
        for(const request of await cache.keys()){this.excluded.add(request.url);await cache.delete(request);}
        this.announce(null,'cleared');
      } finally {this.clearing=false;}
    }
  }
  globalThis.DiwanOffline={byteRange,cachedResponse,AudioStore};
})();
