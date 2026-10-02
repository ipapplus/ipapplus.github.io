(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const search=$('package-search'),clear=$('search-clear');
  const list=$('package-list'),status=$('package-status'),menu=$('build-menu');
  const filters=[...document.querySelectorAll('[data-architecture]')];
  const labels={'iphoneos-arm':'Rootful','iphoneos-arm64':'Rootless','iphoneos-arm64e':'RootHide'};
  const order=Object.keys(labels);
  const icons={
    download:'<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></svg>',
    copy:'<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/></svg>',
    check:'<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6"/></svg>'
  };
  const indexURL=new URL('Packages',window.location.href);
  let entries=[],selectedArchitecture='',activeTrigger=null,loadState='loading';
  let addedDates=new Map();
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const refreshButton=$('refresh-packages'),topButton=$('back-to-top');
  let expandedEntry=null,loading=false;
  const animations=new Set();
  function stopAnimations(){animations.forEach(animation=>animation.cancel());animations.clear();}
  function animate(node,frames){
    const animation=node.animate(frames,{duration:190,easing:'cubic-bezier(.2,.7,.2,1)'});
    animations.add(animation);
    animation.onfinish=()=>animations.delete(animation);
  }
  function toggleEntry(entry){
    closeMenu();
    const visible=entries.filter(item=>!item.card.hidden);
    // Read the current presentation before cancelling, so rapid taps retarget smoothly.
    const before=visible.map(item=>({item,top:item.card.getBoundingClientRect().top,height:item.shell.getBoundingClientRect().height}));
    const previous=expandedEntry,next=previous===entry?null:entry;
    stopAnimations();
    if(previous){previous.card.classList.remove('is-expanded');previous.expand.setAttribute('aria-expanded','false');}
    expandedEntry=next;
    if(next){next.card.classList.add('is-expanded');next.expand.setAttribute('aria-expanded','true');}
    if(reducedMotion.matches||!entry.card.animate)return;
    // One layout after the state change; every animation frame uses only transform/opacity.
    const after=before.map(state=>({...state,rect:state.item.card.getBoundingClientRect()}));
    after.forEach(({item,top,height,rect})=>{
      // Keep offscreen cards out of the compositor layer budget on long lists.
      if(Math.max(top+height,rect.bottom)<0||Math.min(top,rect.top)>window.innerHeight)return;
      const offset=top-rect.top;
      if(Math.abs(offset)>.5)animate(item.card,[{transform:'translateY('+offset+'px)'},{transform:'translateY(0)'}]);
      if(Math.abs(height-rect.height)>.5)animate(item.shell,[{transform:'scaleY('+height/rect.height+')'},{transform:'scaleY(1)'}]);
      if(item===previous||item===next)animate(item.info,[{opacity:.55,transform:'translateY(2px)'},{opacity:1,transform:'translateY(0)'}]);
    });
  }
  function updateTopButton(){
    const visible=window.scrollY>320;
    topButton.classList.toggle('is-visible',visible);
    topButton.inert=!visible;topButton.tabIndex=visible?0:-1;
    topButton.setAttribute('aria-hidden',String(!visible));
  }
  let scrollPending=false;
  window.addEventListener('scroll',()=>{
    if(scrollPending)return;
    scrollPending=true;
    requestAnimationFrame(()=>{scrollPending=false;updateTopButton();});
  },{passive:true});
  topButton.addEventListener('click',()=>window.scrollTo({top:0,behavior:reducedMotion.matches?'auto':'smooth'}));
  refreshButton.addEventListener('click',()=>loadPackages(true));
  updateTopButton();
  function refreshAdditionTimes(){
    entries.forEach(entry=>{if(entry.addedTime)entry.addedTime.textContent=RepoUI.additionTime(new Date(entry.addedAt));});
  }
  setInterval(refreshAdditionTimes,60000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshAdditionTimes();});

  function text(parent,tag,className,value){
    const node=document.createElement(tag);node.className=className;node.textContent=value;
    parent.appendChild(node);return node;
  }
  function parsePackages(value){
    return value.replace(/\r\n?/g,'\n').split(/\n[ \t]*\n/).filter(block=>block.trim()).map(block=>{
      const fields=Object.create(null);let key='';
      for(const line of block.split('\n')){
        if(/^[ \t]/.test(line)){
          if(key)fields[key]+='\n'+(line.trim()==='.'?'':line.slice(1));
        }else{
          const colon=line.indexOf(':');key=colon>0?line.slice(0,colon):'';
          if(key)fields[key]=line.slice(colon+1).trim();
        }
      }
      return fields;
    });
  }
  function downloadURL(filename){
    if(!filename)return null;
    try{const url=new URL(filename,indexURL);return ['http:','https:'].includes(url.protocol)?url.href:null;}
    catch(error){return null;}
  }
  function sizeLabel(value){
    const size=Number(value);if(!value||!Number.isFinite(size)||size<0)return '';
    if(size<1024)return size+' B';
    if(size<1048576)return (size/1024).toFixed(1)+' KB';
    return (size/1048576).toFixed(1)+' MB';
  }
  function groupPackages(packages){
    const groups=new Map();
    for(const pkg of packages){
      // Only the identifier and version define a group; display metadata can vary by build.
      const key=pkg.Package&&pkg.Version?JSON.stringify([pkg.Package,pkg.Version]):Symbol();
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(pkg);
    }
    return [...groups.values()];
  }
  function closeMenu(restoreFocus=false){
    const previous=activeTrigger;
    if(previous)previous.setAttribute('aria-expanded','false');
    activeTrigger=null;menu.hidden=true;
    if(restoreFocus&&previous&&previous.isConnected)previous.focus({preventScroll:true});
  }
  function positionMenu(trigger){
    const rect=trigger.getBoundingClientRect(),viewport=window.visualViewport;
    const left=viewport?viewport.offsetLeft:0,top=viewport?viewport.offsetTop:0;
    const width=viewport?viewport.width:window.innerWidth,height=viewport?viewport.height:window.innerHeight;
    const gutter=8;
    menu.style.width=Math.min(190,Math.max(0,width-gutter*2))+'px';
    menu.style.maxHeight=Math.max(0,height-gutter*2)+'px';
    menu.style.left=Math.max(left+gutter,Math.min(rect.right-menu.offsetWidth,left+width-menu.offsetWidth-gutter))+'px';
    const below=rect.bottom+6,above=rect.top-menu.offsetHeight-6;
    const y=below+menu.offsetHeight<=top+height-gutter?below:above;
    menu.style.top=Math.max(top+gutter,Math.min(y,top+height-menu.offsetHeight-gutter))+'px';
  }
  async function copyLink(entry,url){
    const button=entry.copy;
    try{
      await RepoUI.copyText(url);
      button.innerHTML=icons.check;button.dataset.feedback='Copied!';
      button.setAttribute('aria-label','Copied download link for '+entry.name);
      RepoUI.toast('Copied!');
    }catch(error){RepoUI.toast('Unable to copy. Try again.');}
    clearTimeout(button.copyTimer);
    button.copyTimer=setTimeout(()=>{
      button.innerHTML=icons.copy;delete button.dataset.feedback;
      button.setAttribute('aria-label','Copy download link for '+entry.name);
    },2000);
  }
  function showMenu(entry,mode,trigger){
    const opening=activeTrigger!==trigger;
    closeMenu();if(!opening)return;
    const fragment=document.createDocumentFragment();
    const heading=text(fragment,'p','menu-heading',mode==='copy'?'Copy link · choose a build':'Download · choose a build');
    heading.setAttribute('role','presentation');
    for(const variant of entry.available){
      const item=document.createElement(mode==='copy'?'button':'a');
      item.className='package-target';item.setAttribute('role','menuitem');item.tabIndex=-1;
      text(item,'span','',labels[variant.pkg.Architecture]||variant.pkg.Architecture||'Other');
      if(sizeLabel(variant.pkg.Size))text(item,'span','build-size',sizeLabel(variant.pkg.Size));
      if(mode==='copy'){
        item.type='button';
        item.addEventListener('click',()=>{closeMenu(true);copyLink(entry,variant.url);});
      }else{
        item.href=variant.url;item.setAttribute('download','');
        item.addEventListener('click',()=>closeMenu(true));
      }
      fragment.appendChild(item);
    }
    menu.replaceChildren(fragment);
    menu.setAttribute('aria-label',(mode==='copy'?'Copy download link for ':'Download ')+entry.name);
    activeTrigger=trigger;trigger.setAttribute('aria-expanded','true');menu.hidden=false;
    positionMenu(trigger);
    menu.querySelector('[role="menuitem"]').focus({preventScroll:true});
  }
  function configureActions(entry){
    const available=entry.available;
    [entry.download,entry.copy].forEach(button=>{
      button.removeAttribute('aria-haspopup');button.removeAttribute('aria-expanded');button.removeAttribute('aria-controls');
      if(available.length>1){
        button.setAttribute('aria-haspopup','menu');button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','build-menu');
      }
    });
    if(available.length>1)entry.download.setAttribute('role','button');
    else entry.download.removeAttribute('role');
    entry.copy.disabled=available.length===0;
    if(available.length){
      entry.download.href=available[0].url;entry.download.removeAttribute('aria-disabled');entry.download.removeAttribute('tabindex');
    }else{
      entry.download.removeAttribute('href');entry.download.setAttribute('aria-disabled','true');entry.download.tabIndex=-1;
    }
    entry.download.title=available.length>1?'Download · choose a build':'Download'+(available.length?' · '+(labels[available[0].pkg.Architecture]||available[0].pkg.Architecture||'Other'):' unavailable');
    entry.copy.title=available.length>1?'Copy link · choose a build':'Copy download link';
  }
  function createEntry(group,index){
    const pkg=group[0],name=pkg.Name||pkg.Package||'Unnamed package';
    const card=document.createElement('article');card.className='package-entry';
    const shell=document.createElement('div');shell.className='package-shell';shell.setAttribute('aria-hidden','true');card.appendChild(shell);
    const info=document.createElement('div');info.className='package-info';card.appendChild(info);
    const title=document.createElement('div');title.className='package-title';info.appendChild(title);
    const heading=text(title,'h2','','');heading.id='package-name-'+index;heading.title=name;
    const expand=text(heading,'button','package-expand',name);expand.type='button';
    expand.setAttribute('aria-expanded','false');
    card.setAttribute('aria-labelledby',heading.id);
    if(pkg.Version){const version=text(info,'p','package-version','v'+pkg.Version.replace(/^v+/i,''));version.title=pkg.Version;version.setAttribute('aria-label','Version '+pkg.Version);}
    const meta=text(info,'p','package-meta','');
    const description=text(info,'p','package-description',pkg.Description||'No description provided.');description.title=pkg.Description||'';
    description.id='package-description-'+index;expand.setAttribute('aria-controls',description.id);
    const actions=document.createElement('div');actions.className='package-actions';card.appendChild(actions);
    const addedAt=addedDates.get(pkg.Package);
    const time=text(actions,'time','package-added',addedAt?RepoUI.additionTime(new Date(addedAt)):'');
    const addedTime=addedAt?time:null;
    if(addedTime){addedTime.dateTime=addedAt;addedTime.title='Added '+new Date(addedAt).toLocaleString();}
    else time.setAttribute('aria-hidden','true');
    const controls=document.createElement('div');controls.className='package-controls';actions.appendChild(controls);
    const download=document.createElement('a');download.className='icon-button package-download';download.innerHTML=icons.download;download.setAttribute('download','');
    download.setAttribute('aria-label','Download '+name);controls.appendChild(download);
    const copy=document.createElement('button');copy.type='button';copy.className='icon-button package-copy';copy.innerHTML=icons.copy;
    copy.setAttribute('aria-label','Copy download link for '+name);controls.appendChild(copy);
    card.addEventListener('click',event=>{
      if(controls.contains(event.target))return;
      toggleEntry(entry);
    });
    const variants=group.map(item=>({pkg:item,url:downloadURL(item.Filename),searchText:[item.Name,item.Package,item.Description,item.Filename].filter(Boolean).join('\n').toLowerCase()}));
    variants.sort((a,b)=>{
      const ai=order.indexOf(a.pkg.Architecture),bi=order.indexOf(b.pkg.Architecture);
      return (ai<0?order.length:ai)-(bi<0?order.length:bi);
    });
    const entry={card,shell,info,expand,name,meta,download,copy,variants,available:[],addedAt,addedTime};
    download.addEventListener('click',event=>{
      event.stopPropagation();
      if(entry.available.length===0){event.preventDefault();return;}
      if(entry.available.length>1){event.preventDefault();showMenu(entry,'download',download);}
    });
    download.addEventListener('keydown',event=>{
      if(event.key===' '&&entry.available.length>1){event.preventDefault();showMenu(entry,'download',download);}
    });
    copy.addEventListener('click',event=>{
      event.stopPropagation();
      if(entry.available.length>1)showMenu(entry,'copy',copy);
      else if(entry.available.length)copyLink(entry,entry.available[0].url);
    });
    return entry;
  }
  function filterPackages(){
    stopAnimations();
    clear.hidden=search.value.length===0;
    closeMenu();
    if(loadState!=='ready')return;
    const query=search.value.trim().toLowerCase();let count=0;
    for(const entry of entries){
      const matching=entry.variants.filter(variant=>variant.searchText.includes(query)&&(!selectedArchitecture||variant.pkg.Architecture===selectedArchitecture));
      entry.card.hidden=matching.length===0;
      if(entry.card.hidden){
        if(expandedEntry===entry){entry.card.classList.remove('is-expanded');entry.expand.setAttribute('aria-expanded','false');expandedEntry=null;}
        continue;
      }
      count++;
      entry.meta.textContent=[...new Set(matching.map(variant=>labels[variant.pkg.Architecture]||variant.pkg.Architecture||'Other'))].join(' · ');
      entry.meta.title=entry.meta.textContent;
      entry.available=matching.filter(variant=>variant.url);
      configureActions(entry);
    }
    status.textContent=count+' of '+entries.length+' packages';
    $('reset-filters').hidden=!query&&!selectedArchitecture;
    $('empty-state').hidden=count!==0;
    $('empty-heading').textContent=entries.length?'No packages found':'No packages available';
    $('empty-message').textContent=entries.length?'Try another search or architecture.':'The package index is currently empty.';
    $('empty-action').textContent='Reset filters';$('empty-action').hidden=!entries.length;
  }
  function resetFilters(){
    search.value='';selectedArchitecture='';
    filters.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.architecture==='')));
    filterPackages();
  }
  search.addEventListener('input',filterPackages);
  clear.addEventListener('click',()=>{search.value='';filterPackages();search.focus();});
  filters.forEach(button=>button.addEventListener('click',()=>{
    selectedArchitecture=button.dataset.architecture;
    filters.forEach(option=>option.setAttribute('aria-pressed',String(option===button)));
    filterPackages();
  }));
  $('reset-filters').addEventListener('click',resetFilters);
  $('empty-action').addEventListener('click',()=>{if(loadState==='error')loadPackages();else resetFilters();});
  document.addEventListener('pointerdown',event=>{
    if(activeTrigger&&!menu.contains(event.target)&&!activeTrigger.contains(event.target)){
      // Restore keyboard focus only if the outside tap has no focusable destination.
      const restore=!event.target.closest('a,button,input,textarea,select,[tabindex]');
      closeMenu(restore);
    }
  });
  document.addEventListener('focusin',event=>{if(activeTrigger&&!menu.contains(event.target)&&event.target!==activeTrigger)closeMenu();});
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'){
      if(activeTrigger){event.preventDefault();closeMenu(true);}
    }else if(activeTrigger&&event.key==='Tab'){
      // Return to the trigger before the browser advances to the adjacent control.
      closeMenu(true);
    }
  });
  menu.addEventListener('keydown',event=>{
    const items=[...menu.querySelectorAll('[role="menuitem"]')];
    let index=items.indexOf(document.activeElement);
    if(event.key==='ArrowDown')index=(index+1)%items.length;
    else if(event.key==='ArrowUp')index=(index-1+items.length)%items.length;
    else if(event.key==='Home')index=0;
    else if(event.key==='End')index=items.length-1;
    else return;
    event.preventDefault();items[index].focus();
  });
  document.addEventListener('scroll',event=>{if(activeTrigger&&!menu.contains(event.target))closeMenu(true);},true);
  window.addEventListener('resize',()=>{closeMenu(true);stopAnimations();});
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize',()=>{if(activeTrigger)positionMenu(activeTrigger);});
    window.visualViewport.addEventListener('scroll',()=>{if(activeTrigger)positionMenu(activeTrigger);});
  }
  async function loadPackages(force=false){
    if(loading)return;
    loading=true;refreshButton.disabled=true;refreshButton.classList.add('is-refreshing');refreshButton.setAttribute('aria-busy','true');
    closeMenu();stopAnimations();
    loadState='loading';list.setAttribute('aria-busy','true');status.textContent='Loading packages…';$('empty-state').hidden=true;
    try{
      // The same response provides both the package data and its update timestamp.
      const [response,history]=await Promise.all([fetch('Packages',{cache:'no-cache'}),RepoUI.loadAdditions(force).catch(()=>[...addedDates].map(([packageId,addedAt])=>({package:packageId,addedAt})))]);
      if(!response.ok)throw new Error('Package index request failed');
      RepoUI.trackModified($('last-updated'),response.headers.get('Last-Modified'),'Last Updated');
      const groups=groupPackages(parsePackages(await response.text()));
      addedDates=new Map(history.map(entry=>[entry.package,entry.addedAt]));
      groups.sort((a,b)=>(Date.parse(addedDates.get(b[0].Package))||0)-(Date.parse(addedDates.get(a[0].Package))||0));
      expandedEntry=null;entries=groups.map(createEntry);
      const fragment=document.createDocumentFragment();entries.forEach(entry=>fragment.appendChild(entry.card));list.replaceChildren(fragment);
      loadState='ready';filterPackages();
    }catch(error){
      if(entries.length){loadState='ready';filterPackages();RepoUI.toast('Unable to refresh. Try again.');return;}
      loadState='error';status.textContent='Unable to load packages';$('empty-state').hidden=false;
      $('empty-heading').textContent='The package index could not be loaded';
      $('empty-message').textContent='Check your connection and try again.';
      $('empty-action').hidden=false;$('empty-action').textContent='Try again';
    }finally{
      loading=false;list.setAttribute('aria-busy','false');refreshButton.disabled=false;
      refreshButton.classList.remove('is-refreshing');refreshButton.setAttribute('aria-busy','false');updateTopButton();
    }
  }
  loadPackages();
})();
