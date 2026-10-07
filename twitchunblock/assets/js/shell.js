(function () {
  'use strict';
  const ui=window.TwitchUI, auth=window.TwitchAuth;
  let booted=false, profile=null, profileId=null, authError=null, signedUser=null, activeHash='', activePanel='', routeVersion=0, backRoute='#home';
  const scrolls=new Map();let restoring=0,interaction=0;document.addEventListener('wheel',()=>interaction++,{passive:true});document.addEventListener('pointerdown',()=>interaction++);document.addEventListener('keydown',()=>interaction++);
  if ('scrollRestoration' in history) history.scrollRestoration='manual';
  function currentRoute() {
    const raw=location.hash.slice(1), index=raw.indexOf('?'), path=index<0?raw:raw.slice(0,index), params=new URLSearchParams(index<0?'':raw.slice(index+1));
    if(path.startsWith('channel/'))return{panel:'channel',login:path.slice(8),params};
    if(path.startsWith('category/')&&/^\d+$/.test(path.slice(9)))return{panel:'home',gameId:path.slice(9),name:(params.get('name')||'').slice(0,200),view:'categories',params};
    return{panel:['home','search','history','settings'].includes(path)?path:'home',view:['saved','categories'].includes(params.get('view'))?params.get('view'):'live',params};
  }
  function renderHistory(){const rows=window.TwitchHistory.list();ui.grid(document.getElementById('history-results'),rows,true);ui.status(document.getElementById('history-state'),!window.TwitchHistory.storageOK?'history.storage':rows.length?null:'emptyHistory');document.getElementById('clear-history').disabled=!rows.length;}
  function renderAuth() {
    const signedIn = Boolean(auth.session);
    const container = document.getElementById('user-session'); container.replaceChildren();
    const signIn = document.getElementById('sign-in'); signIn.hidden = signedIn; signIn.disabled = !window.TwitchConfig.clientId || Boolean(auth.challenge);
    if (auth.challenge) {
      const link = ui.el('a', 'button', ui.t('auth.activate')); link.href = auth.challenge.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
      const code = ui.el('bdi', '', auth.challenge.code); code.dir = 'ltr';
      const cancel = ui.el('button', 'button', ui.t('auth.cancel')); cancel.type = 'button'; cancel.addEventListener('click', () => auth.cancelLogin());
      container.append(link, code, cancel);
    }
    if (signedIn) {
      if (profile) container.append(ui.avatar(profile.avatar));
      container.append(ui.name(profile?.name || auth.session.login));
      const logout = ui.el('button', 'button', ui.t('auth.logout')); logout.type = 'button'; logout.addEventListener('click', () => auth.logout()); container.append(logout);
    }
    const key = authError || auth.message || (!window.TwitchConfig.clientId ? 'auth.unconfigured' : null);
    ui.status(document.getElementById('auth-state'), key);
    document.getElementById('settings-logout').hidden = !signedIn;
  }
  async function loadProfile() {
    const userId = auth.session?.userId;
    if (!userId) { profile = null; profileId = null; renderAuth(); return; }
    if (profileId === userId) return;
    profileId = userId;
    try { const users = await window.TwitchAPI.users({ id: userId }); if (auth.session?.userId === userId) { profile = users[0] || null; renderAuth(); } }
    catch (_) { if (auth.session?.userId === userId) renderAuth(); }
  }
  async function show(focus=false,force=false) {
    const route=currentRoute(), version=++routeVersion, hash=location.hash||'#home', previous=activePanel, interactionAtStart=interaction, restoreY=scrolls.get(hash)||0;restoring=version;
    if(route.panel==='channel'&&previous&&previous!=='channel')backRoute=activeHash||'#home';
    activeHash=hash;activePanel=route.panel;
    document.querySelectorAll('[data-panel]').forEach(el=>el.hidden=el.dataset.panel!==route.panel);
    document.querySelectorAll('[data-section]').forEach(el=>{if(el.dataset.section===route.panel||(route.panel==='channel'&&el.dataset.section==='search'))el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
    document.getElementById('channel-back').href=backRoute;
    window.TwitchHome.cancel();window.TwitchSearch.cancel();window.TwitchChannel.cancel();
    if(route.panel==='channel'){
      if(/^[a-zA-Z0-9_]{1,25}$/.test(route.login))await window.TwitchChannel.open(route.login.toLowerCase(),route.params,force);
      else{window.TwitchChannel.reset();ui.status(document.getElementById('channel-state'),'channel.notFound');}
    }else if(route.panel==='home')await window.TwitchHome.open({view:route.view,gameId:route.gameId,name:route.name},force);
    else if(route.panel==='search')await window.TwitchSearch.open(route.params);
    else if(route.panel==='history')renderHistory();
    if(version!==routeVersion)return;
    if(focus&&previous!==route.panel)document.querySelector('[data-panel]:not([hidden]) h2')?.focus({preventScroll:true});
    requestAnimationFrame(()=>{if(version!==routeVersion)return;if(interactionAtStart===interaction)window.scrollTo({top:restoreY,behavior:'instant'});restoring=0;scrolls.set(hash,window.scrollY);});
  }
  window.addEventListener('scroll',()=>{if(activeHash&&!restoring)scrolls.set(activeHash,window.scrollY);},{passive:true});
  document.addEventListener('click',event=>{const link=event.target.closest('a[href^="#"]');if(link&&activeHash)scrolls.set(activeHash,window.scrollY);});
  document.getElementById('sign-in').addEventListener('click',()=>auth.login());
  document.getElementById('settings-logout').addEventListener('click',()=>auth.logout());
  document.getElementById('clear-history').addEventListener('click',()=>{window.TwitchHistory.clear();ui.status(document.getElementById('settings-state'),'history.cleared');});
  document.getElementById('clear-saved').addEventListener('click',()=>{window.TwitchDiscovery.clearSaved();ui.status(document.getElementById('settings-state'),'p0.savedCleared');});
  document.getElementById('retry-channel').addEventListener('click',()=>show(false,true));
  document.addEventListener('historychange',renderHistory);
  document.addEventListener('savedchange',()=>document.getElementById('clear-saved').disabled=!window.TwitchDiscovery.list().length);
  document.addEventListener('authchange',()=>{authError=null;renderAuth();loadProfile();const user=auth.session?.userId||null;if(user!==signedUser){signedUser=user;window.TwitchDiscovery.clearCache();window.TwitchHome.reset();window.TwitchSearch.reset();window.TwitchChannel.reset();if(booted)show();}});
  document.addEventListener('languagechange',()=>{renderAuth();renderHistory();document.getElementById('settings-state').textContent='';});
  window.addEventListener('hashchange',()=>{if(location.hash!=='#main')show(true);});
  setInterval(()=>{if(document.hidden)return;if(activePanel==='home'&&auth.session)window.TwitchHome.refresh();else if(activePanel==='channel'&&auth.session)window.TwitchChannel.refreshLive();},90000);
  renderAuth();renderHistory();document.getElementById('clear-saved').disabled=!window.TwitchDiscovery.list().length;
  auth.initialize().then(()=>{booted=true;renderAuth();loadProfile();show();});
})();
