(function () {
  'use strict';
  const ui=window.TwitchUI, api=window.TwitchAPI, store=window.TwitchDiscovery;
  const profile=document.getElementById('channel-profile'), status=document.getElementById('channel-state');
  let current=null, tab='videos', period='all', controller=null, state=null;
  const records=new Map(), tabs=['videos','highlights','clips'];
  function renderProfile() {
    const focused=document.activeElement?.id==='save-channel';profile.replaceChildren();
    document.getElementById('channel-heading').replaceChildren(current ? ui.name(current.channel.name) : document.createTextNode(ui.t('channel.heading')));
    if(!current){document.getElementById('channel-library').hidden=true;ui.status(status,state);return;}
    const channel=current.channel;const identity=ui.el('div','project-heading');identity.append(ui.avatar(channel.avatar));const name=ui.el('div');name.append(ui.name('@'+channel.login));identity.append(name);
    const save=ui.el('button','button',ui.t(store.has(channel.login)?'p0.unsave':'p0.save'));save.id='save-channel';save.type='button';save.setAttribute('aria-pressed',String(store.has(channel.login)));save.addEventListener('click',()=>store.toggle(channel));identity.append(save);profile.append(identity);
    const hero=ui.el('div','channel-hero-body');if(channel.stream)hero.append(ui.thumbnail(channel.stream.thumbnail,'preview hero-preview'));const details=ui.el('div','channel-details');details.append(ui.streamInfo(channel));
    if(channel.stream?.gameId){const category=ui.el('a','text-link',ui.t('p0.exploreCategory'));category.href='#category/'+channel.stream.gameId+'?name='+encodeURIComponent(channel.stream.game);details.append(category);}
    const external=ui.el('a','button primary',ui.t(channel.stream?'p0.watchExternal':'channel.openTwitch'));external.href='https://www.twitch.tv/'+channel.login;external.target='_blank';external.rel='noopener noreferrer';details.append(external);hero.append(details);profile.append(hero);
    if(channel.description){const description=ui.el('p','channel-description',channel.description);description.dir='auto';profile.append(description);}
    ui.status(status,!store.storageOK?'p0.savedStorage':state);document.getElementById('channel-library').hidden=false;if(focused)document.getElementById('save-channel').focus({preventScroll:true});
  }
  function renderMedia() {
    const library=document.getElementById('channel-library');library.hidden=!current;if(!current)return;
    tabs.forEach(type=>{const button=document.getElementById('tab-'+type);button.setAttribute('aria-selected',String(type===tab));button.tabIndex=type===tab?0:-1;document.getElementById('panel-'+type).hidden=type!==tab;});
    document.getElementById('clip-period-label').hidden=tab!=='clips';document.getElementById('clip-period').value=period;
    const record=current.media[tab], container=document.getElementById('channel-'+tab), query=document.getElementById('media-filter').value.trim().toLowerCase();
    container.setAttribute('aria-busy',String(Boolean(record?.busy)));
    const rows=record?.rows||[], filtered=rows.filter(item=>!query||[item.title,item.created,ui.date(item.created)].join(' ').toLowerCase().includes(query));
    if(record?.busy&&!rows.length)ui.skeleton(container);
    else if(filtered.length)container.replaceChildren(...filtered.map(ui.mediaCard));
    else container.replaceChildren(ui.el('p','small-note',ui.t(record?.state || (query&&rows.length?'p0.noFilter':tab==='clips'?'media.empty.clips':tab==='highlights'?'p0.noHighlights':'media.empty.videos'))));
    document.getElementById('media-count').textContent=rows.length?ui.t('p0.loaded',{shown:ui.number(filtered.length),count:ui.number(rows.length)}):'';
    const more=document.getElementById('media-more');more.hidden=!record?.cursor||tab==='clips'||rows.length>=120;more.disabled=Boolean(record?.busy);
    document.getElementById('media-retry').hidden=!record?.state||record.state.startsWith('media.empty');
  }
  function render(){renderProfile();renderMedia();}
  async function loadMedia(more=false,force=false) {
    if(!current||!controller)return;const active=controller, owner=current, type=tab;
    const existing=owner.media[type];if(existing&&!existing.busy&&!more&&!force&&(type!=='clips'||existing.period===period)){renderMedia();return;}
    const record={rows:more?existing?.rows||[]:[],cursor:'',busy:true,period};owner.media[type]=record;renderMedia();
    try {
      const result=type==='clips'?{rows:await api.clips(owner.channel.id,active.signal,period),cursor:''}:await api.videoPage(owner.channel.id,type==='highlights'?'highlight':'archive',more?existing?.cursor:'',active.signal);
      if(controller!==active)return;const seen=new Set();record.rows=[...record.rows,...result.rows].filter(item=>!seen.has(item.id)&&seen.add(item.id)).slice(0,120);record.cursor=result.cursor;
    } catch(error){if(controller!==active||active.signal.aborted)return;record.state=ui.errorKey(error);}
    finally {if(controller===active){record.busy=false;renderMedia();}}
  }
  function cancel(){controller?.abort();controller=null;profile.setAttribute('aria-busy','false');}
  async function open(login,params=new URLSearchParams(),force=false) {
    cancel();controller=new AbortController();const active=controller;tab=tabs.includes(params.get('tab'))?params.get('tab'):'videos';period=['1','7','30'].includes(params.get('period'))?params.get('period'):'all';
    const cached=records.get(login);current=!force&&cached&&Date.now()-cached.time<90000?cached:null;state=null;
    if(current){document.getElementById('media-filter').value=current.filter||'';render();await loadMedia();return;}
    state='data.loading';current=null;render();ui.skeleton(profile,1);profile.setAttribute('aria-busy','true');
    try {const channel=await api.channel(login,active.signal);if(controller!==active)return;current={channel,media:{},time:Date.now(),filter:cached?.filter||''};records.set(login,current);if(records.size>15)records.delete(records.keys().next().value);state=null;document.getElementById('media-filter').value=current.filter;window.TwitchHistory.add(channel);render();await loadMedia();}
    catch(error){if(controller!==active||active.signal.aborted)return;current=null;state=ui.errorKey(error);render();}
    finally{if(controller===active)profile.setAttribute('aria-busy','false');}
  }
  function navigateTab(type){if(!current)return;const params=new URLSearchParams({tab:type});if(type==='clips'&&period!=='all')params.set('period',period);location.hash='channel/'+current.channel.login+'?'+params;}
  document.querySelectorAll('[data-media-tab]').forEach(button=>{button.addEventListener('click',()=>navigateTab(button.dataset.mediaTab));button.addEventListener('keydown',event=>{let next=tabs.indexOf(tab);if(['ArrowRight','ArrowLeft'].includes(event.key)){event.preventDefault();const direction=(event.key==='ArrowRight'?1:-1)*(document.documentElement.dir==='rtl'?-1:1);next=(next+direction+tabs.length)%tabs.length;}else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;event.preventDefault();document.getElementById('tab-'+tabs[next]).focus();navigateTab(tabs[next]);});});
  document.getElementById('media-filter').addEventListener('input',()=>{if(current)current.filter=document.getElementById('media-filter').value;renderMedia();});
  document.getElementById('clip-period').addEventListener('change',event=>{period=event.target.value;if(current)delete current.media.clips;navigateTab('clips');});
  document.getElementById('media-more').addEventListener('click',()=>loadMedia(true));document.getElementById('media-retry').addEventListener('click',()=>loadMedia(false,true));
  document.addEventListener('savedchange',()=>{if(current)renderProfile();});document.addEventListener('languagechange',render);
  window.TwitchChannel={open,cancel,async refreshLive(){if(!current||!controller)return;const owner=current,active=controller;try{const channel=await api.channel(owner.channel.login,active.signal);if(current===owner&&controller===active){owner.channel=channel;owner.time=Date.now();renderProfile();}}catch(_){}},reset(){cancel();records.clear();current=null;state=null;render();},render};
})();
