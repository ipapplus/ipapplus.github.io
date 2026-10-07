(function () {
  'use strict';
  const ui=window.TwitchUI, store=window.TwitchDiscovery;
  const form=document.getElementById('search-form'), input=document.getElementById('channel'), results=document.getElementById('search-results'), list=document.getElementById('search-suggestions');
  let rows=[], state='search.prompt', busy=false, controller=null, suggestController=null, timer=null, suggestions=[], selected=-1, sequence=0, composing=false;
  function recent() { const entries=window.TwitchHistory.list().slice(0,6); document.getElementById('search-recent-block').hidden=!entries.length;ui.compact(document.getElementById('search-recent'),entries); }
  function render() { ui.status(document.getElementById('search-state'),state);if(busy&&!rows.length)ui.skeleton(results);else ui.grid(results,rows);results.setAttribute('aria-busy',String(busy));form.querySelector('[type="submit"]').disabled=busy;document.getElementById('search-count').textContent=rows.length ? ui.t('p0.results',{count:ui.number(rows.length)}) : '';recent(); }
  function hide() { sequence++;clearTimeout(timer);suggestController?.abort();suggestions=[];selected=-1;list.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant'); }
  function highlight() { [...list.children].forEach((n,i)=>{n.setAttribute('aria-selected',String(i===selected));});if(selected>=0){input.setAttribute('aria-activedescendant','suggestion-'+selected);list.children[selected]?.scrollIntoView({block:'nearest'});}else input.removeAttribute('aria-activedescendant'); }
  function pick(index) { const row=suggestions[index];if(!row)return;input.value=row.login;hide();input.blur();location.hash='channel/'+row.login; }
  function renderSuggestions() {
    list.replaceChildren(...suggestions.map((row,i)=>{const option=ui.el('div','suggestion-row');option.id='suggestion-'+i;option.setAttribute('role','option');option.append(ui.avatar(row.avatar),ui.name(row.name));if(row.stream)option.append(ui.el('span','pill live-pill',ui.t('channel.live')));option.addEventListener('click',()=>pick(i));option.addEventListener('pointerdown',e=>{e.preventDefault();pick(i);});return option;}));
    list.hidden=!suggestions.length;input.setAttribute('aria-expanded',String(Boolean(suggestions.length)));highlight();
  }
  async function suggest() {
    hide();const query=input.value.trim().replace(/^@/,'');if(query.length<2||composing)return;
    const active=sequence;suggestController=new AbortController();const signal=suggestController.signal;
    const local=[...window.TwitchHistory.list(),...store.list()].filter(r=>r.login.includes(query.toLowerCase())||r.name.toLowerCase().includes(query.toLowerCase()));
    suggestions=local.slice(0,7);renderSuggestions();
    if(!window.TwitchAuth.session)return;
    try { const key='suggest:'+query.toLowerCase();const remote=store.cached(key,45000)||store.put(key,await window.TwitchAPI.search(query,false,signal));if(active!==sequence||signal.aborted)return;const selectedLogin=suggestions[selected]?.login;const seen=new Set();suggestions=[...remote,...local].filter(r=>!seen.has(r.login)&&seen.add(r.login)).slice(0,7);selected=selectedLogin?suggestions.findIndex(r=>r.login===selectedLogin):-1;renderSuggestions(); }
    catch(_){ /* Full search exposes actionable errors; suggestions keep available local entries. */ }
  }
  async function submit(event, updateRoute=true, force=true) {
    event?.preventDefault();hide();const query=input.value.trim().replace(/^@/,'');const live=document.getElementById('live-only').checked;
    if(updateRoute&&query){const params=new URLSearchParams({q:query});if(live)params.set('live','1');const hash='#search?'+params;if(location.hash!==hash){controller?.abort();busy=true;results.setAttribute('aria-busy','true');location.hash=hash;return;}}
    controller?.abort();controller=new AbortController();const active=controller;
    if(!query){rows=[];busy=false;state='search.empty';render();input.focus();return;}
    const key='search:'+query.toLowerCase()+':'+live,cached=!force&&store.cached(key,90000);
    if(cached){rows=cached;state=rows.length?null:'search.noResults';busy=false;render();return;}
    busy=true;rows=[];state='data.loading';render();
    try { const found=await window.TwitchAPI.search(query,live,active.signal);if(controller!==active)return;rows=store.put(key,found);state=rows.length?null:'search.noResults'; }
    catch(error){if(controller!==active||active.signal.aborted)return;state=ui.errorKey(error);}
    finally {if(controller===active){busy=false;render();}}
  }
  async function open(params) { hide();if(params.has('q')){input.value=params.get('q').slice(0,100);document.getElementById('live-only').checked=params.get('live')==='1';await submit(null,false,false);}else render(); }
  function reset(){hide();controller?.abort();controller=null;rows=[];busy=false;state=window.TwitchAuth.message||'search.prompt';render();}
  form.addEventListener('submit',submit);document.getElementById('live-only').addEventListener('change',()=>{if(input.value.trim())submit();});
  input.addEventListener('input',()=>{hide();if(!composing)timer=setTimeout(suggest,300);});
  input.addEventListener('compositionstart',()=>{composing=true;hide();});input.addEventListener('compositionend',()=>{composing=false;timer=setTimeout(suggest,300);});
  input.addEventListener('keydown',event=>{if(event.key==='Escape'){hide();return;}if(!suggestions.length)return;if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();selected=(selected+(event.key==='ArrowDown'?1:suggestions.length-1)+suggestions.length)%suggestions.length;highlight();}else if(event.key==='Enter'&&selected>=0){event.preventDefault();pick(selected);}});
  input.addEventListener('blur',hide);
  document.addEventListener('languagechange',()=>{render();if(suggestions.length)renderSuggestions();});document.addEventListener('historychange',recent);
  window.TwitchSearch={submit,open,reset,cancel(){hide();controller?.abort();controller=null;busy=false;},render};render();
})();
