(function(){
  'use strict';
  function relativeTime(date,now=Date.now()){
    const seconds=Math.max(0,Math.floor((now-date.getTime())/1000));
    if(seconds<60)return 'Just now';
    const unit=seconds>=86400?'day':seconds>=3600?'hour':'minute';
    const count=Math.floor(seconds/(unit==='day'?86400:unit==='hour'?3600:60));
    return count+' '+unit+(count===1?'':'s')+' ago';
  }
  function trackModified(element,header,label){
    const date=header?new Date(header):null;
    if(!date||Number.isNaN(date.getTime()))return;
    element.title=date.toLocaleString('en-US');
    function refresh(){element.textContent=label+': '+relativeTime(date);}
    refresh();
    setInterval(refresh,60000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
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
  window.RepoUI={relativeTime,trackModified,toast,copyText};
})();
