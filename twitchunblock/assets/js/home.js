(function () {
  'use strict';
  const ui = window.TwitchUI, api = window.TwitchAPI, store = window.TwitchDiscovery;
  let options = {}, rows = [], games = [], state = null, controller = null, busy = false;
  const results = document.getElementById('home-results'), categories = document.getElementById('home-categories');
  document.getElementById('stream-language').value=store.streamLanguage;
  function renderRecent() { const recent = window.TwitchHistory.list().slice(0,6); document.getElementById('home-recent-block').hidden = !recent.length; ui.compact(document.getElementById('home-recent'),recent); }
  function render() {
    const view = options.view || 'live', isCategory = Boolean(options.gameId), showGames = view === 'categories' && !isCategory;
    document.getElementById('home-heading').textContent = isCategory ? options.name || ui.t('p0.categoryStreams') : ui.t(view === 'saved' ? 'p0.saved' : showGames ? 'p0.categories' : 'p0.top');
    document.querySelectorAll('[data-home-view]').forEach(a => { if (a.dataset.homeView === (isCategory ? 'categories' : view)) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); });
    document.getElementById('home-intro').textContent = ui.t(view === 'saved' && !isCategory ? 'p0.savedHint' : showGames ? 'p0.categoriesHint' : 'home.liveIntro');
    document.getElementById('stream-language').closest('label').hidden = showGames || view === 'saved';
    results.hidden = showGames; categories.hidden = !showGames;
    results.setAttribute('aria-busy',String(busy)); categories.setAttribute('aria-busy',String(busy));
    ui.status(document.getElementById('home-state'),state);
    if (busy && !(showGames ? games.length : rows.length)) ui.skeleton(showGames ? categories : results);
    else if (showGames && !(busy && games.length)) categories.replaceChildren(...games.map(game => { const a = ui.el('a','category-card'); a.href = '#category/' + game.id + '?name=' + encodeURIComponent(game.name); a.append(ui.thumbnail(game.thumbnail,'category-preview')); const title=ui.el('h3','',game.name);title.dir='auto';a.append(title);return a; }));
    else if (!showGames && !(busy && rows.length)) ui.grid(results,rows,view === 'saved' && !window.TwitchAuth.session);
    renderRecent();
  }
  async function open(next = {}, force = false, preserve = false) {
    controller?.abort(); controller = new AbortController(); const active = controller; options = next;
    const language = document.getElementById('stream-language').value;
    const view = options.view || 'live', cacheKey = 'home:' + JSON.stringify({ ...options, language });
    const cached = !force && store.cached(cacheKey);
    rows = cached?.rows || (preserve ? rows : []); games = cached?.games || (preserve ? games : []); state = null; busy = !cached;
    if (cached) { render(); return; }
    if (view === 'saved' && !window.TwitchAuth.session) { rows = store.list(); busy = false; state = rows.length ? null : 'p0.savedEmpty'; render(); return; }
    render();
    try {
      let loadedRows = [], loadedGames = [];
      if (view === 'categories' && !options.gameId) loadedGames = await api.categories(active.signal);
      else if (view === 'saved' && !options.gameId) loadedRows = await api.byLogins(store.list().map(r => r.login),active.signal);
      else loadedRows = await api.home(active.signal,{ gameId: options.gameId, language });
      if (controller !== active) return;
      rows = loadedRows; games = loadedGames;
      state = (view === 'categories' && !options.gameId ? games.length : rows.length) ? null : view === 'saved' ? 'p0.savedEmpty' : 'home.empty';
      store.put(cacheKey,{ rows, games });
    } catch (error) { if (controller !== active || active.signal.aborted) return; state = ui.errorKey(error); }
    finally { if (controller === active) { busy = false; render(); } }
  }
  function refresh() { return open(options,true,true); }
  document.getElementById('refresh-home').addEventListener('click',refresh);
  document.getElementById('stream-language').addEventListener('change',()=>{store.streamLanguage=document.getElementById('stream-language').value;open(options,true);});
  document.addEventListener('historychange',renderRecent);
  document.addEventListener('savedchange',()=>{ if (options.view==='saved') open(options,true); });
  document.addEventListener('languagechange',render);
  window.TwitchHome = { open, refresh, render, cancel() { controller?.abort(); controller=null;busy=false; }, reset() { controller?.abort();rows=[];games=[];state=null;busy=false; } };
})();
