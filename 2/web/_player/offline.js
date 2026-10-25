export class OfflineLibrary extends EventTarget {
  constructor(base){
    super();this.base=base;this.states=new Map();this.entries=[];this.available=false;this.loaded=false;this.revision=0;
    this.ready=this.start();this.ready.catch(()=>{});
  }
  async start(){
    if(!('serviceWorker'in navigator)||!('caches'in window)||!window.isSecureContext)throw Error('Unavailable');
    navigator.serviceWorker.addEventListener('message',event=>{
      const message=event.data;if(message?.type!=='DIWAN_AUDIO')return;
      this.revision++;
      if(message.state==='cleared')this.states.clear();
      else if(message.state==='removed')this.states.delete(message.url);
      else if(message.url?.startsWith(this.base.href))this.states.set(message.url,message);
      this.dispatchEvent(new Event('change'));
      if(['saved','removed','cleared'].includes(message.state))this.refresh().catch(()=>{});
    });
    let registration;
    try {registration=await navigator.serviceWorker.register(new URL('sw.js',this.base),{scope:this.base.pathname,updateViaCache:'none'});}
    catch(error){
      registration=await navigator.serviceWorker.getRegistration(this.base.href);
      // An offline update check may fail while our existing worker still works.
      // Never fall back to the personal website's broader root registration.
      if(registration?.scope!==this.base.href||!registration.active)throw error;
    }
    // Wait for the newly installing worker, rather than sending the new protocol
    // to an older active worker during a first upgrade of the existing website.
    const candidate=registration.installing||registration.waiting||registration.active;
    if(!candidate)throw Error('Unavailable');
    if(candidate.state!=='activated')await new Promise((resolve,reject)=>{
      const check=()=>{
        if(candidate.state==='activated'){candidate.removeEventListener('statechange',check);resolve();}
        else if(candidate.state==='redundant'){candidate.removeEventListener('statechange',check);reject(Error('Installation failed'));}
      };
      candidate.addEventListener('statechange',check);check();
    });
    this.worker=registration.active;this.available=!!this.worker;
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      const controller=navigator.serviceWorker.controller;
      if(controller&&new URL(controller.scriptURL).pathname===new URL('sw.js',this.base).pathname){this.worker=controller;this.refresh().catch(()=>{});}
    });
    await this.refresh(false);
    return this;
  }
  async command(command,url,wait=true){
    if(wait)await this.ready;
    if(!this.worker)throw Error('Unavailable');
    return new Promise((resolve,reject)=>{
      const channel=new MessageChannel(),timeout=setTimeout(()=>{channel.port1.close();reject(Error('Timeout'));},15000);
      channel.port1.onmessage=event=>{clearTimeout(timeout);channel.port1.close();event.data.ok?resolve(event.data.result):reject(Error('Storage unavailable'));};
      this.worker.postMessage({type:'DIWAN_AUDIO_COMMAND',command,url},[channel.port2]);
    });
  }
  refresh(wait=true){
    if(wait)return this.ready.then(()=>this.refresh(false));
    const read=async()=>{
      let result,revision;
      // A save/delete notification received during a disk snapshot invalidates it.
      do {revision=this.revision;result=await this.command('LIST',undefined,wait);}while(revision!==this.revision);
      this.loaded=true;this.entries=result.entries;this.shellReady=result.shellReady;
      const failures=[...this.states].filter(([,state])=>state.state==='failed');
      this.states=new Map(failures);
      for(const item of [...result.entries,...result.pending])this.states.set(item.url,item);
      this.dispatchEvent(new Event('change'));return result;
    };
    const next=(this.refreshing||Promise.resolve()).catch(()=>{}).then(read);
    this.refreshing=next;return next;
  }
  state(track){return this.states.get(new URL(track.url,this.base).href);}
  save(track){return this.command('SAVE',new URL(track.url,this.base).href).catch(()=>{
    this.states.set(new URL(track.url,this.base).href,{state:'failed'});this.dispatchEvent(new Event('change'));
  });}
  async remove(url){await this.command('REMOVE',url);await this.refresh();}
  async clear(){await this.command('CLEAR');await this.refresh();}
}

export function setupOfflineManagement(offline,{count,size,trackLabel}) {
  const $=id=>document.getElementById(id),dialog=$('saved-audio');
  function draw(){
    $('saved-summary').textContent=`${count(offline.entries.length,'track')}، المساحة التقريبية: ${size(offline.entries.reduce((sum,entry)=>sum+entry.bytes,0))}`;
    $('offline-shell-status').textContent=offline.shellReady?'المكتبة جاهزة للتصفح دون إنترنت في هذا المتصفح.':'لم يكتمل حفظ واجهة المكتبة بعد؛ أبقِ جهازك متصلًا بالإنترنت.';
    $('clear-audio').disabled=!offline.entries.length;
    const rows=offline.entries.map(entry=>{
      const row=document.createElement('div');row.className='saved-row';
      const info=document.createElement('div'),title=document.createElement('strong'),path=document.createElement('small');
      title.textContent=trackLabel(entry.track);title.dir='auto';
      path.textContent=`${entry.track.folder.split('/').at(-1)} · ${size(entry.bytes)}`;path.dir='auto';info.append(title,path);
      const remove=document.createElement('button');remove.className='text-button';remove.textContent='حذف';
      remove.setAttribute('aria-label',`حذف ${trackLabel(entry.track)} من المقاطع المحفوظة`);
      remove.onclick=async()=>{remove.disabled=true;try{await offline.remove(entry.url);}catch{$('saved-summary').textContent='تعذّر حذف النسخة المحفوظة. أعد المحاولة.';remove.disabled=false;}};
      row.append(info,remove);return row;
    });
    if(!rows.length){const empty=document.createElement('p');empty.className='muted';empty.textContent='لا مقاطع محفوظة بعد. شغّل مقطعًا أو اختر حفظه من قائمته.';rows.push(empty);}
    $('saved-list').replaceChildren(...rows);
  }
  window.addEventListener('diwan-numerals-change',()=>{if(dialog.open&&offline.loaded)draw();});
  offline.addEventListener('change',()=>{if(dialog.open&&offline.loaded)draw();});
  $('cache-settings').onclick=()=>{
    dialog.showModal();
    offline.refresh().then(draw).catch(()=>{$('saved-summary').textContent='تعذّر الوصول إلى التخزين المحلي. قد لا يتيحه المتصفح أو تكون مساحة التخزين ممتلئة.';$('offline-shell-status').textContent='يمكنك الاستماع عبر الإنترنت كالمعتاد.';});
  };
  dialog.addEventListener('close',()=>$('cache-settings').focus());
  $('clear-audio').onclick=()=>$('confirm-cache-delete').showModal();
  $('confirm-clear-audio').onclick=async()=>{
    $('confirm-clear-audio').disabled=true;
    try{await offline.clear();$('confirm-cache-delete').close();draw();}
    catch{$('saved-summary').textContent='تعذّر حذف المقاطع المحفوظة. أعد المحاولة.';$('confirm-cache-delete').close();}
    finally{$('confirm-clear-audio').disabled=false;}
  };
  if(typeof navigator.storage?.persist==='function'){
    $('persist-storage').hidden=false;
    $('persist-storage').onclick=()=>{
      $('persist-storage').disabled=true;
      navigator.storage.persist().then(granted=>{
        $('persistence-status').textContent=granted?'وافق المتصفح على طلب الاحتفاظ بالبيانات. يمكنك حذفها من إعدادات المتصفح.':'لم يمنح المتصفح الإذن. يمكنك حفظ المقاطع، وقد يحذفها المتصفح عند الحاجة إلى مساحة.';
      }).catch(()=>{$('persistence-status').textContent='تعذّر طلب الاحتفاظ بالبيانات في هذا المتصفح.';}).finally(()=>{$('persist-storage').disabled=false;});
    };
  }
}
