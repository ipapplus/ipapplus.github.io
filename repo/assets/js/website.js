(function(){
  'use strict';
  const {t,ago}=RepoI18n;
  function relativeTime(date,now=Date.now()){
    const seconds=Math.max(0,Math.floor((now-date.getTime())/1000));
    if(seconds<60)return t('justNow');
    const unit=seconds>=86400?'day':seconds>=3600?'hour':'minute';
    const count=Math.floor(seconds/(unit==='day'?86400:unit==='hour'?3600:60));
    return ago(unit==='day'?'daysAgo':unit==='hour'?'hoursAgo':'minutesAgo',count);
  }
  function additionTime(date,now=Date.now()){
    const minutes=Math.max(1,Math.floor((now-date.getTime())/60000));
    const n=minutes>=1440?Math.floor(minutes/1440):minutes>=60?Math.floor(minutes/60):minutes;
    return ago(minutes>=1440?'daysAgo':minutes>=60?'hoursAgo':'minutesAgo',n);
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
    });
    return additions;
  }
  function trackModified(element,header){
    if(element.modifiedCleanup)element.modifiedCleanup();
    element.modifiedCleanup=null;
    const date=header?new Date(header):null;
    if(!date||Number.isNaN(date.getTime())){
      element.dataset.i18n='updatedUnknown';element.textContent=t('updatedUnknown');element.removeAttribute('title');return;
    }
    element.removeAttribute('data-i18n');
    function refresh(){
      element.title=RepoI18n.date(date);
      element.replaceChildren(document.createTextNode(t('lastUpdated')+': '));
      const time=document.createElement('bdi');time.dir='auto';time.textContent=relativeTime(date);element.appendChild(time);
    }
    refresh();
    const timer=setInterval(refresh,60000);
    const onVisible=()=>{if(!document.hidden)refresh();};
    document.addEventListener('visibilitychange',onVisible);
    document.addEventListener('repo:languagechange',refresh);
    element.modifiedCleanup=()=>{clearInterval(timer);document.removeEventListener('visibilitychange',onVisible);document.removeEventListener('repo:languagechange',refresh);};
  }
  function toast(key){
    const element=document.getElementById('toast');
    if(!element)return;
    toast.key=key;element.textContent=t(key);
    element.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer=setTimeout(()=>element.classList.remove('show'),2200);
  }
  document.addEventListener('repo:languagechange',()=>{
    const element=document.getElementById('toast');
    if(element&&toast.key)element.textContent=t(toast.key);
  });
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
