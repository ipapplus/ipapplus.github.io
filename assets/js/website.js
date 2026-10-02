(function(){
  'use strict';
  function relativeTime(date,now=Date.now()){
    const seconds=Math.max(0,Math.floor((now-date.getTime())/1000));
    if(seconds<60)return 'Just now';
    const unit=seconds>=86400?'day':seconds>=3600?'hour':'minute';
    const count=Math.floor(seconds/(unit==='day'?86400:unit==='hour'?3600:60));
    return count+' '+unit+(count===1?'':'s')+' ago';
  }
  function additionTime(date,now=Date.now()){
    const minutes=Math.max(1,Math.floor((now-date.getTime())/60000));
    return minutes>=1440?Math.floor(minutes/1440)+'d ago':minutes>=60?Math.floor(minutes/60)+'h ago':minutes+'m ago';
  }
  let additions;
  function loadAdditions(force=false){
    if(force)additions=null;
    if(!additions)additions=fetch('assets/data/latest-additions.json',{cache:'no-cache'}).then(response=>{
      if(!response.ok)throw new Error('Additions request failed');
      return response.json();
    }).then(entries=>{
      if(!Array.isArray(entries)||entries.some(entry=>!entry||!entry.package||!entry.addedAt||!Number.isFinite(Date.parse(entry.addedAt))))throw new Error('Invalid additions JSON');
      return entries.sort((a,b)=>Date.parse(b.addedAt)-Date.parse(a.addedAt));
    }).catch(error=>{additions=null;throw error;});
    return additions;
  }
  function trackModified(element,header,label){
    const date=header?new Date(header):null;
    if(!date||Number.isNaN(date.getTime()))return;
    element.title=date.toLocaleString('en-US');
    function refresh(){element.textContent=label+': '+relativeTime(date);}
    refresh();
    clearInterval(element.modifiedTimer);
    if(element.modifiedListener)document.removeEventListener('visibilitychange',element.modifiedListener);
    element.modifiedTimer=setInterval(refresh,60000);
    element.modifiedListener=()=>{if(!document.hidden)refresh();};
    document.addEventListener('visibilitychange',element.modifiedListener);
  }
  function toast(message){
    const element=document.getElementById('toast');
    if(!element)return;
    element.textContent=message;
    element.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer=setTimeout(()=>element.classList.remove('show'),2200);
  }
  async function copyText(value){
    if(navigator.clipboard&&window.isSecureContext){
      try{await navigator.clipboard.writeText(value);return;}catch(error){/* Use the selection fallback if clipboard access is denied. */}
    }
    const previous=document.activeElement;
    const area=document.createElement('textarea');
    area.value=value;area.setAttribute('readonly','');
    area.style.cssText='position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px';
    document.body.appendChild(area);
    area.focus({preventScroll:true});area.select();area.setSelectionRange(0,value.length);
    try{if(!document.execCommand('copy'))throw new Error('Copy failed');}
    finally{area.remove();if(previous&&previous.isConnected)previous.focus({preventScroll:true});}
  }
  window.RepoUI={relativeTime,additionTime,loadAdditions,trackModified,toast,copyText};
})();
