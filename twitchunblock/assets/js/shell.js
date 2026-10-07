(function () {
  'use strict';
  const ui = window.TwitchUI;
  const auth = window.TwitchAuth;
  const sections = ['home', 'search', 'history', 'settings'];
  let booted = false;
  let homeRows = [];
  let homeState = 'data.loading';
  let homeController = null;
  let profile = null;
  let profileId = null;
  let authError = null;
  function currentRoute() {
    const route = location.hash.slice(1);
    if (route.startsWith('channel/')) return { panel: 'channel', login: route.slice(8) };
    return { panel: sections.includes(route) ? route : 'home' };
  }
  function renderHome() { ui.status(document.getElementById('home-state'), homeState); ui.grid(document.getElementById('home-results'), homeRows); }
  async function home() {
    homeController?.abort(); const active = new AbortController(); homeController = active;
    homeRows = []; homeState = 'data.loading'; renderHome();
    const container = document.getElementById('home-results'); container.setAttribute('aria-busy', 'true');
    try { const rows = await window.TwitchAPI.home(active.signal); if (homeController !== active) return; homeRows = rows; homeState = rows.length ? null : 'home.empty'; }
    catch (error) { if (homeController !== active || active.signal.aborted) return; homeState = ui.errorKey(error); }
    finally { if (homeController === active) { container.setAttribute('aria-busy', 'false'); renderHome(); } }
  }
  function renderHistory() {
    const rows = window.TwitchHistory.list();
    ui.grid(document.getElementById('history-results'), rows, true);
    ui.status(document.getElementById('history-state'), !window.TwitchHistory.storageOK ? 'history.storage' : rows.length ? null : 'emptyHistory');
    document.getElementById('clear-history').disabled = !rows.length;
  }
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
    const key = authError || auth.message || (!window.TwitchConfig.clientId ? 'auth.unconfigured' : !signedIn ? 'auth.required' : null);
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
  function show(focus = false) {
    const route = currentRoute();
    document.querySelectorAll('[data-panel]').forEach(el => el.hidden = el.dataset.panel !== route.panel);
    document.querySelectorAll('[data-section]').forEach(el => { if (el.dataset.section === route.panel || (route.panel === 'channel' && el.dataset.section === 'search')) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current'); });
    window.TwitchChannel.cancel();
    if (route.panel === 'channel') {
      if (/^[a-zA-Z0-9_]{1,25}$/.test(route.login)) window.TwitchChannel.open(route.login.toLowerCase());
      else { window.TwitchChannel.reset(); ui.status(document.getElementById('channel-state'), 'channel.notFound'); }
    } else if (route.panel === 'home') home();
    else if (route.panel === 'history') renderHistory();
    if (focus) document.querySelector('[data-panel]:not([hidden]) h2')?.focus();
  }
  document.getElementById('sign-in').addEventListener('click', () => auth.login());
  document.getElementById('settings-logout').addEventListener('click', () => auth.logout());
  document.getElementById('clear-history').addEventListener('click', () => { window.TwitchHistory.clear(); ui.status(document.getElementById('settings-state'), 'history.cleared'); });
  document.getElementById('refresh-home').addEventListener('click', home);
  document.getElementById('retry-channel').addEventListener('click', () => show());
  document.addEventListener('historychange', renderHistory);
  document.addEventListener('authchange', () => {
    authError = null; renderAuth(); loadProfile();
    if (booted) { window.TwitchSearch.reset(); window.TwitchChannel.reset(); show(); }
  });
  document.addEventListener('languagechange', () => { renderAuth(); renderHome(); renderHistory(); document.getElementById('settings-state').textContent = ''; });
  window.addEventListener('hashchange', () => { if (location.hash !== '#main') show(true); });
  renderAuth(); renderHistory();
  auth.initialize().then(() => { booted = true; renderAuth(); loadProfile(); show(); });
})();
