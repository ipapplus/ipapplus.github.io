// Minimal DOM/event model: exercises the production script, not CSS/rendering.
let testResult="Tests did not complete";const nativeLog=s=>{testResult=s;};const console={log:nativeLog};
let clock=0,jobs=[];const nativeTimer=(fn,ms)=>jobs.push({fn,at:clock+ms});const nativeURL=(p,b)=>/^https?:/.test(p)?p:"https://repo.test/"+p;
const window=globalThis;
window.location={href:'https://repo.test/packages.html'};
const motion={matches:false,addEventListener(type,fn){this.change=fn;}};window.matchMedia=()=>motion;window.addEventListener=()=>{};
window.setInterval=()=>0;
let timerId=0;const timers=new Map();
window.setTimeout=(fn,delay)=>{const id=++timerId;timers.set(id,fn);nativeTimer(()=>{const callback=timers.get(id);timers.delete(id);if(callback)callback();},delay);return id;};
window.clearTimeout=id=>timers.delete(id);
class URL{constructor(path,base){this.href=nativeURL(String(path),String(base||''));this.protocol=this.href.split(':')[0]+':';}toString(){return this.href;}}
class Element{
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.parentElement=null;this.attributes={};this.dataset={};this.style={};this.hidden=false;this.disabled=false;this.listeners={};this.textContent='';this.value='';this.animations=[];}
  set className(value){this.attributes.class=value;}get className(){return this.attributes.class||'';}
  get classList(){return {contains:name=>this.className.split(' ').includes(name),toggle:(name,on)=>{const values=new Set(this.className.split(' ').filter(Boolean));on=on===undefined?!values.has(name):on;on?values.add(name):values.delete(name);this.className=[...values].join(' ');return on;},add:name=>this.classList.toggle(name,true),remove:name=>this.classList.toggle(name,false)};}
  setAttribute(name,value){this.attributes[name]=String(value);}getAttribute(name){return this.attributes[name]??null;}removeAttribute(name){delete this.attributes[name];}hasAttribute(name){return name in this.attributes;}
  appendChild(child){if(child.tagName==='FRAGMENT'){for(const node of [...child.children])this.appendChild(node);return child;}child.parentElement=this;this.children.push(child);return child;}
  replaceChildren(...children){this.children.forEach(child=>child.parentElement=null);this.children=[];children.forEach(child=>this.appendChild(child));}
  contains(node){for(;node;node=node.parentElement)if(node===this)return true;return false;}
  matches(selector){if(selector[0]==='.')return this.classList.contains(selector.slice(1));if(selector[0]==='['){const [name,value]=selector.slice(1,-1).split('=');return value===undefined?this.hasAttribute(name):this.getAttribute(name)===value.replace(/"/g,'');}return this.tagName===selector.toUpperCase();}
  closest(selector){for(let node=this;node;node=node.parentElement)if(selector.split(',').some(s=>node.matches(s.trim())))return node;return null;}
  querySelectorAll(selector){const result=[];for(const child of this.children){if(selector.split(',').some(s=>child.matches(s.trim())))result.push(child);result.push(...child.querySelectorAll(selector));}return result;}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  addEventListener(type,fn){(this.listeners[type]||=[]).push(fn);}removeEventListener(){}
  dispatchEvent(event){event.target=event.target||this;for(let node=this;node;node=node.parentElement){for(const fn of node.listeners[event.type]||[])fn(event);if(event.stopped)break;}return true;}
  click(){if(!this.disabled)this.dispatchEvent({type:'click',stopPropagation(){this.stopped=true;},preventDefault(){this.prevented=true;}});}
  focus(){document.activeElement=this;}
  get isConnected(){return document.contains(this);}
  getBoundingClientRect(){let height=this.closest('.is-open')?800:100;const active=this.animations.find(animation=>!animation.canceled);if(active){const t=Math.min(1,(Date.now()-active.start)/active.duration);height=active.from+(active.to-active.from)*t;}return {height,left:0,top:0,right:88,bottom:height,width:88};}
  animate(frames,options){let resolve,reject;const animation={start:clock,duration:options.duration,from:parseFloat(frames[0].height),to:parseFloat(frames[1].height),canceled:false,finished:new Promise((r,j)=>{resolve=r;reject=j;}),cancel(){if(this.canceled)return;this.canceled=true;clearTimeout(this.timer);reject(new Error('canceled'));}};animation.timer=setTimeout(resolve,options.duration);this.animations.push(animation);return animation;}
  getAnimations(){return this.animations.filter(animation=>!animation.canceled);}
}
const document=new Element('document');document.baseURI=window.location.href;
const ids=new Map();
document.getElementById=id=>ids.get(id);document.createElement=tag=>new Element(tag);document.createDocumentFragment=()=>new Element('fragment');
for(const id of ['package-search','search-clear','package-list','package-status','build-menu','reset-filters','empty-state','empty-heading','empty-message','empty-action','last-updated','refresh-packages','back-to-top','top-sentinel']){const node=new Element(id==='package-search'?'input':'div');node.id=id;ids.set(id,node);document.appendChild(node);}
ids.get('package-list').setAttribute('tabindex','-1');
for(const architecture of ['', 'iphoneos-arm','iphoneos-arm64','iphoneos-arm64e']){const node=new Element('button');node.dataset.architecture=architecture;node.setAttribute('data-architecture',architecture);document.appendChild(node);}
const RepoUI={versionKey:(p,v)=>JSON.stringify([p,v]),additionTime:()=> '2m ago',loadAdditions:async()=>[{package:'test.0',addedAt:'2026-01-02'},{package:'test.1',addedAt:'2026-01-01'}],trackModified(){},toast(){},copyText:async()=>{window.copies++;}};
window.copies=0;window.requests=0;
let packages='';for(let i=0;i<3;i++)for(const architecture of ['iphoneos-arm','iphoneos-arm64'])packages+=`Package: test.${i}\nName: Package ${i}\nVersion: v1.0\nArchitecture: ${architecture}\nDescription: Original long description ${i}\nFilename: debs/${i}-${architecture}.deb\n\n`;
window.fetch=async()=>{window.requests++;await new Promise(resolve=>setTimeout(resolve,20));return {ok:true,headers:{get:()=>null},text:async()=>packages};};

const getComputedStyle=node=>{
 const active=node.getAnimations().find(a=>Number.isFinite(a.from));
 const natural=node.classList.contains('is-open')?828:128;
 const t=active?Math.min(1,(clock-active.start)/active.duration):0;
 return {height:String(active?active.from+(active.to-active.from)*t:natural)+'px'};
};
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
  const indexURL=new URL('Packages',document.baseURI);
  let entries=[],selectedArchitecture='',activeTrigger=null,loadState='loading';
  let addedDates=new Map();
  let expandedEntry=null,loading=false;
  const cardEntries=new WeakMap();
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  reducedMotion.addEventListener('change',()=>{
    if(!reducedMotion.matches)return;
    entries.forEach(entry=>{if(entry.expansion)setExpanded(entry,entry===expandedEntry);});
    if(menuAnimation){menuAnimation.cancel();menuAnimation=null;menu.hidden=!activeTrigger;}
  });
  const interactive='a,button,input,textarea,select,summary,[contenteditable],[role="button"],[role="link"],[tabindex]';
  function commitExpansion(entry,expanded){
    entry.card.classList.toggle('is-expanded',expanded);
    entry.expand.setAttribute('aria-expanded',String(expanded));
    entry.card.classList.toggle('is-open',expanded);
  }
  function expandCards(changes){
    // CSS layout heights exclude the press transform; capture interrupted motion too.
    const before=changes.map(([entry])=>parseFloat(getComputedStyle(entry.card).height));
    changes.forEach(([entry,expanded])=>{
      if(entry.expansion){entry.expansion.cancel();entry.expansion=null;}
      commitExpansion(entry,expanded);
    });
    // Measure the actual border-box targets, including padding and the action column.
    // Reads and writes are batched, never repeated on animation frames.
    const after=changes.map(([entry])=>parseFloat(getComputedStyle(entry.card).height));
    changes.forEach(([entry,expanded],index)=>{
      if(!entry.card.animate||reducedMotion.matches||entry.card.hidden||!Number.isFinite(before[index])||!Number.isFinite(after[index])||before[index]===after[index])return;
      // Wrap full content once, then reveal/clip it as the card's bottom edge moves.
      // WAAPI installs both explicit pixel endpoints in this task, without an
      // intermediate intrinsic-height paint or a CSS transition startup reflow.
      entry.card.classList.add('is-open');
      const animation=entry.card.animate([
        {height:before[index]+'px'},
        {height:after[index]+'px'}
      ],{duration:260,easing:'cubic-bezier(.25,.1,.25,1)',fill:'both'});
      entry.expansion=animation;
      animation.finished.then(()=>{
        if(entry.expansion!==animation)return;
        entry.card.classList.toggle('is-open',expanded);
        entry.expansion=null;animation.cancel();
        // Removing the effect restores intrinsic height for responsive reflow.
      }).catch(()=>{/* Canceled by a newer interaction or refresh. */});
    });
  }
  function setExpanded(entry,expanded){
    if(entry.expansion){entry.expansion.cancel();entry.expansion=null;}
    commitExpansion(entry,expanded);
  }
  list.addEventListener('click',event=>{
    const target=event.target instanceof Element?event.target:event.target.parentElement;
    const card=target.closest('.package-entry'),entry=card&&cardEntries.get(card);
    if(!entry)return;
    const control=target.closest(interactive);
    // Only interactive descendants count; never the list's tabindex ancestor.
    if(control&&card.contains(control)&&control!==entry.expand)return;
    toggleEntry(entry);
  });
  function toggleEntry(entry){
    closeMenu();
    const previous=expandedEntry;
    expandedEntry=previous===entry?null:entry;
    const changes=[];
    if(previous)changes.push([previous,false]);
    if(expandedEntry)changes.push([expandedEntry,true]);
    expandCards(changes);
  }
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
  let menuAnimation=null;
  function animateMenu(opening){
    if(menuAnimation){menuAnimation.cancel();menuAnimation=null;}
    menu.classList.toggle('is-closing',!opening);
    menu.inert=!opening;
    if(opening)menu.removeAttribute('aria-hidden');else menu.setAttribute('aria-hidden','true');
    if(reducedMotion.matches||!menu.animate){menu.hidden=!opening;return;}
    const frames=[{opacity:0,transform:'translateY(-3px)'},{opacity:1,transform:'translateY(0)'}];
    const animation=menu.animate(opening?frames:frames.slice().reverse(),{duration:180,easing:'cubic-bezier(.25,.8,.25,1)',fill:'both'});
    menuAnimation=animation;
    animation.finished.then(()=>{
      if(menuAnimation!==animation)return;
      menu.hidden=!opening;menuAnimation=null;animation.cancel();
    }).catch(()=>{/* Replaced by a newer open/close. */});
  }
  function closeMenu(restoreFocus=false){
    const previous=activeTrigger;
    if(previous)previous.setAttribute('aria-expanded','false');
    activeTrigger=null;
    if(previous)animateMenu(false);
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
      button.dataset.feedback='Copied!';
      button.setAttribute('aria-label','Copied download link for '+entry.name);
      RepoUI.toast('Copied!');
    }catch(error){RepoUI.toast('Unable to copy. Try again.');}
    clearTimeout(button.copyTimer);
    button.copyTimer=setTimeout(()=>{
      delete button.dataset.feedback;
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
    animateMenu(true);
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
    const addedAt=addedDates.get(RepoUI.versionKey(pkg.Package,pkg.Version));
    const time=text(actions,'time','package-added',addedAt?RepoUI.additionTime(new Date(addedAt)):'');
    const addedTime=addedAt?time:null;
    if(addedTime){addedTime.dateTime=addedAt;addedTime.title='Added '+new Date(addedAt).toLocaleString();}
    else time.setAttribute('aria-hidden','true');
    const controls=document.createElement('div');controls.className='package-controls';actions.appendChild(controls);
    const download=document.createElement('a');download.className='icon-button package-download';download.innerHTML=icons.download;download.setAttribute('download','');
    download.setAttribute('aria-label','Download '+name);controls.appendChild(download);
    const copy=document.createElement('button');copy.type='button';copy.className='icon-button package-copy';copy.innerHTML=icons.copy.replace('<svg ', '<svg class="copy-original" ')+icons.check.replace('<svg ', '<svg class="copy-check" ');
    copy.setAttribute('aria-label','Copy download link for '+name);controls.appendChild(copy);
    const variants=group.map(item=>({pkg:item,url:downloadURL(item.Filename),searchText:[item.Name,item.Package,item.Description,item.Filename].filter(Boolean).join('\n').toLowerCase()}));
    variants.sort((a,b)=>{
      const ai=order.indexOf(a.pkg.Architecture),bi=order.indexOf(b.pkg.Architecture);
      return (ai<0?order.length:ai)-(bi<0?order.length:bi);
    });
    const entry={card,info,expand,name,meta,download,copy,variants,available:[],addedAt,addedTime};
    cardEntries.set(card,entry);
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
    clear.hidden=search.value.length===0;
    closeMenu();
    if(loadState!=='ready')return;
    const query=search.value.trim().toLowerCase();let count=0;
    for(const entry of entries){
      const matching=entry.variants.filter(variant=>variant.searchText.includes(query)&&(!selectedArchitecture||variant.pkg.Architecture===selectedArchitecture));
      entry.card.hidden=matching.length===0;
      if(entry.card.hidden){
        if(expandedEntry===entry){setExpanded(entry,false);expandedEntry=null;}
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
  document.addEventListener('scroll',event=>{if(activeTrigger&&!menu.contains(event.target))closeMenu(true);},{capture:true,passive:true});
  window.addEventListener('resize',()=>{
    closeMenu(true);
    // Let natural text reflow immediately if the viewport changes mid-animation.
    entries.forEach(entry=>{if(entry.expansion)setExpanded(entry,entry===expandedEntry);});
  });
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize',()=>{if(activeTrigger)positionMenu(activeTrigger);});
    window.visualViewport.addEventListener('scroll',()=>{if(activeTrigger)positionMenu(activeTrigger);});
  }
  const refresh=$('refresh-packages'),backToTop=$('back-to-top');
  refresh.addEventListener('click',()=>loadPackages(true));
  // A sentinel avoids doing work on every scroll event.
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(([entry])=>{
      backToTop.classList.toggle('is-visible',!entry.isIntersecting);
      backToTop.disabled=entry.isIntersecting;
    });
    observer.observe($('top-sentinel'));
  }else{
    let pending=false;
    window.addEventListener('scroll',()=>{
      if(pending)return;
      pending=true;requestAnimationFrame(()=>{
        const visible=window.scrollY>500;
        backToTop.classList.toggle('is-visible',visible);backToTop.disabled=!visible;pending=false;
      });
    },{passive:true});
  }
  backToTop.addEventListener('click',()=>{
    $('refresh-packages').focus({preventScroll:true});
    window.scrollTo({top:0,behavior:reducedMotion.matches?'auto':'smooth'});
  });
  async function loadPackages(force=false){
    if(loading)return;
    loading=true;refresh.disabled=true;refresh.classList.add('is-refreshing');refresh.setAttribute('aria-busy','true');
    const hadEntries=entries.length>0;
    closeMenu();
    loadState='loading';list.setAttribute('aria-busy','true');status.textContent='Loading packages…';$('empty-state').hidden=true;
    try{
      // The same response provides both the package data and its update timestamp.
      const [response,history]=await Promise.all([
        fetch('Packages',{cache:'no-cache'}),
        RepoUI.loadAdditions(force).catch(()=>[...addedDates].map(([key,addedAt])=>{const [packageId,version]=JSON.parse(key);return {package:packageId,version,addedAt};}))
      ]);
      if(!response.ok)throw new Error('Package index request failed');
      RepoUI.trackModified($('last-updated'),response.headers.get('Last-Modified'),'Last Updated');
      const groups=groupPackages(parsePackages(await response.text()));
      addedDates=new Map(history.map(entry=>[RepoUI.versionKey(entry.package,entry.version),entry.addedAt]));
      groups.sort((a,b)=>(Date.parse(addedDates.get(RepoUI.versionKey(b[0].Package,b[0].Version)))||0)-(Date.parse(addedDates.get(RepoUI.versionKey(a[0].Package,a[0].Version)))||0));
      entries.forEach(entry=>{if(entry.expansion)entry.expansion.cancel();clearTimeout(entry.copy.copyTimer);});
      expandedEntry=null;entries=groups.map(createEntry);
      const fragment=document.createDocumentFragment();entries.forEach(entry=>fragment.appendChild(entry.card));list.replaceChildren(fragment);
      loadState='ready';filterPackages();
    }catch(error){
      if(hadEntries){loadState='ready';filterPackages();RepoUI.toast('Unable to refresh. Try again.');return;}
      loadState='error';status.textContent='Unable to load packages';$('empty-state').hidden=false;
      $('empty-heading').textContent='The package index could not be loaded';
      $('empty-message').textContent='Check your connection and try again.';
      $('empty-action').hidden=false;$('empty-action').textContent='Try again';
    }finally{
      loading=false;list.setAttribute('aria-busy','false');refresh.disabled=false;
      refresh.classList.remove('is-refreshing');refresh.removeAttribute('aria-busy');
    }
  }
  window.testAPI={closeMenu,showMenu,filterPackages,loadPackages,get entries(){return entries;}};
  loadPackages();
})();


const assert=(ok,s)=>{if(!ok)throw Error(s);};
const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
const advance=async ms=>{clock+=ms;let ready=jobs.filter(x=>x.at<=clock);jobs=jobs.filter(x=>x.at>clock);ready.forEach(x=>x.fn());await flush();};
(async()=>{try{
await advance(50);const api=testAPI,list=ids.get('package-list');
assert(list.children.length===3,'load');
let e=api.entries[0],menu=ids.get('build-menu');
e.card.click();
assert(e.expansion&&e.card.getAnimations().length===1&&!e.info.getAnimations().length,'animate card not inner info');
assert(e.expansion.from===128&&e.expansion.to===828,'actual card endpoints');
const frames=[];for(let i=0;i<8;i++){await advance(25);frames.push(parseFloat(getComputedStyle(e.card).height));}
assert(new Set(frames).size===8&&frames.every((h,i)=>i===0||h>frames[i-1]),'intermediate pixel endpoints');
const interrupted=parseFloat(getComputedStyle(e.card).height);e.card.click();assert(e.expansion.from===interrupted&&e.expansion.to===128,'reverse from presentation height');await advance(280);
assert(!e.expansion&&!e.card.getAnimations().length&&!e.card.classList.contains('is-open'),'collapse cleans intrinsic height');
for(let i=0;i<20;i++){e.card.click();await advance(10);}
await advance(280);assert(!e.expansion&&!e.card.classList.contains('is-open'),'rapid double tap cleanup');
e.card.click();await advance(30);api.entries[1].card.click();assert(e.expansion&&api.entries[1].expansion,'only accordion pair participates');assert(!api.entries[2].expansion,'other cards untouched');await advance(280);
ids.get('reset-filters').click();api.entries[1].card.click();await advance(280);

for(let i=0;i<40;i++){e.download.click();e.copy.click();api.closeMenu(true);}
await advance(200);assert(menu.hidden&&!menu.getAnimations().length,'menu rapid cleanup');
e.download.click();assert(!menu.hidden&&!menu.inert,'menu opens');
const href=menu.querySelector('[role="menuitem"]').href;assert(href.endsWith('iphoneos-arm.deb'),'correct download URL');
menu.querySelector('[role="menuitem"]').click();assert(menu.inert&&!api.entries[0].download.getAttribute('aria-expanded').includes('true'),'closing inaccessible');await advance(200);assert(menu.hidden,'closing complete');
const search=ids.get('package-search');for(const q of ['P','Pa','Package 0','no-match','']){search.value=q;search.dispatchEvent({type:'input'});}
assert(api.entries.every(x=>!x.card.hidden),'quick search resets');
search.value='Package 0';search.dispatchEvent({type:'input'});assert(api.entries.filter(x=>!x.card.hidden).length===1,'single');
search.value='no-match';search.dispatchEvent({type:'input'});assert(!ids.get('empty-state').hidden,'zero');ids.get('search-clear').click();assert(search.value===''&&document.activeElement===search,'clear');
for(let i=0;i<40;i++)document.querySelector('[data-architecture="iphoneos-arm64"]').click();
e.copy.click();await flush();assert(e.copy.dataset.feedback==='Copied!','copy success');await advance(2100);assert(!e.copy.dataset.feedback,'copy restored');
for(let i=0;i<30;i++)e.card.click();await advance(280);assert(!e.card.getAnimations().length,'card cleanup');
const n=requests;for(let i=0;i<20;i++)ids.get('refresh-packages').click();await advance(50);assert(requests===n+1&&!ids.get('refresh-packages').disabled,'refresh guarded');
motion.matches=true;motion.change();e=api.entries[0];ids.get('reset-filters').click();e.download.click();assert(!menu.hidden&&!menu.getAnimations().length,'reduced open');api.closeMenu();assert(menu.hidden,'reduced close');
packages='';for(let i=0;i<600;i++)packages+=`Package: large.${i}\nName: Large ${i}\nVersion: 1\nArchitecture: iphoneos-arm\nFilename: ${i}.deb\n\n`;api.loadPackages();await advance(50);assert(api.entries.length===600,'large set');search.value='Large 599';search.dispatchEvent({type:'input'});assert(api.entries.filter(x=>!x.card.hidden).length===1,'large single');search.value='';search.dispatchEvent({type:'input'});assert(api.entries.every(x=>!x.card.hidden&&!x.card.getAnimations().length),'large no animations');
nativeLog('PASS: card-height endpoints, intermediate interpolation model, interrupted reversals, rapid doubles, accordion pair, cleanup;  600 cards, rapid menus/cards/filters/search, Copy success/restore, download URLs, clear, zero/single results, refresh guard, reduced motion, animation cleanup');
}catch(e){nativeLog('FAIL: '+e.message+' '+e.stack);}})();
