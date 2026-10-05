(function(){
  'use strict';
  // Cache each view's actual nodes: package state, handlers and observers survive.
  // The canvas, toast, radio button and audio always remain body-level siblings.
  const views=new Map(),pending=new Map();
  let current=document.body.classList.contains('landing')?'home':'packages',generation=0;
  const base=new URL('.',location.href);
  function key(url){
    if(url.origin!==base.origin||url.search||url.hash)return null;
    if(url.pathname===base.pathname||url.pathname===new URL('index.html',base).pathname)return 'home';
    return url.pathname===new URL('packages.html',base).pathname?'packages':null;
  }
  function nodes(root){return [...root.querySelectorAll('main,#back-to-top,#back-home,#build-menu')];}
  views.set(current,{nodes:nodes(document),title:document.title,description:document.querySelector('meta[name="description"]').content,scroll:0});
  function initHome(){
    const sileo=document.getElementById('sileo');
    sileo.addEventListener('click',()=>{
      RepoUI.copyText('https://ipapplus.github.io').then(()=>RepoUI.toast('Source URL copied')).catch(()=>{});
    });
    fetch('Packages').then(response=>{
      if(!response.ok)throw new Error('Package index request failed');
      RepoUI.trackModified(document.getElementById('last-seen'),response.headers.get('Last-Modified'),'Last Seen');
    }).catch(()=>{});
  }
  if(current==='home')initHome();
  async function load(view){
    if(views.has(view))return views.get(view);
    if(pending.has(view))return pending.get(view);
    const promise=(async()=>{
      const response=await fetch(new URL(view==='home'?'index.html':'packages.html',base));
      if(!response.ok)throw new Error('View request failed');
      const page=new DOMParser().parseFromString(await response.text(),'text/html');
      const elements=nodes(page);
      if(!page.querySelector(view==='home'?'.profile':'#package-list'))throw new Error('Invalid view');
      const record={nodes:elements,title:page.title,description:page.querySelector('meta[name="description"]').content,scroll:0};
      elements.forEach(element=>{element.hidden=true;document.body.appendChild(document.adoptNode(element));});
      if(view==='home')initHome();
      else await new Promise((resolve,reject)=>{
        const script=document.createElement('script');script.src=new URL('packages.js?v=page-refresh-back-1',base);
        script.onload=resolve;script.onerror=()=>{script.remove();reject(new Error('Package script request failed'));};
        document.body.appendChild(script);
      }).catch(error=>{elements.forEach(element=>element.remove());throw error;});
      views.set(view,record);return record;
    })();
    pending.set(view,promise);
    try{return await promise;}finally{pending.delete(view);}
  }
  async function navigate(url,pop=false){
    const view=key(url);if(!view)return;
    const token=++generation;
    try{
      const next=await load(view);
      if(document.fonts)await document.fonts.ready;
      if(token!==generation)return;
      const previous=views.get(current);previous.scroll=window.scrollY;
      // Close any open architecture menu before hiding its view.
      if(current==='packages')document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));
      const active=document.activeElement;
      if(previous.nodes.some(element=>element.contains(active))&&active instanceof HTMLElement)active.blur();
      document.dispatchEvent(new Event('repoviewwillchange'));
      previous.nodes.forEach(element=>{element.hidden=true;});
      current=view;document.body.classList.toggle('landing',view==='home');
      next.nodes.forEach(element=>{if(element.id!=='build-menu')element.hidden=false;});
      document.title=next.title;document.querySelector('meta[name="description"]').content=next.description;
      if(!pop)history.pushState(null,'',url.href);
      window.scrollTo(0,pop?next.scroll:0);
      document.dispatchEvent(new Event('repoviewchange'));
      const main=next.nodes[0];main.focus({preventScroll:true});
    }catch(error){
      if(token===generation)RepoUI.toast('Unable to open page. Check your connection and try again.');
    }
  }
  if('scrollRestoration' in history)history.scrollRestoration='manual';
  document.addEventListener('click',event=>{
    if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const link=event.target.closest('a[href]');
    if(!link||link.hasAttribute('download')||link.target)return;
    const url=new URL(link.href,location.href);
    if(!key(url))return;
    event.preventDefault();navigate(url);
  });
  window.addEventListener('popstate',()=>navigate(new URL(location.href),true));
})();
