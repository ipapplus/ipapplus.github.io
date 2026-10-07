(function () {
  'use strict';
  const key = 'twitchunblock.savedChannels';
  let saved = [];
  const cache = new Map();
  let storageOK = true;
  function read() {
    try { const rows = JSON.parse(localStorage.getItem(key) || '[]'); saved = Array.isArray(rows) ? rows.filter(r => r && /^[a-zA-Z0-9_]{1,25}$/.test(r.login) && typeof r.name === 'string').slice(0,50).map(r => ({ login: r.login.toLowerCase(), name: r.name.slice(0,200), avatar: window.TwitchAPI.image(r.avatar) })) : []; }
    catch (_) { storageOK = false; }
  }
  function write() { try { localStorage.setItem(key, JSON.stringify(saved)); storageOK = true; } catch (_) { storageOK = false; } for (const name of cache.keys()) if (name.startsWith('home:')) cache.delete(name); document.dispatchEvent(new CustomEvent('savedchange')); }
  read();
  window.TwitchDiscovery = {
    get streamLanguage() { try { const value=localStorage.getItem('twitchunblock.streamLanguage');return ['en','ar'].includes(value)?value:''; } catch(_){return '';} },
    set streamLanguage(value) { try { localStorage.setItem('twitchunblock.streamLanguage',['en','ar'].includes(value)?value:''); } catch(_){} },
    list: () => saved.slice(), has: login => saved.some(r => r.login === login),
    toggle(channel) { if (this.has(channel.login)) saved = saved.filter(r => r.login !== channel.login); else saved = [{ login: channel.login, name: channel.name, avatar: channel.avatar }, ...saved].slice(0,50); write(); },
    clearSaved() { saved = []; write(); }, get storageOK() { return storageOK; },
    cached(key, age = 90000) { const row = cache.get(key); return row && Date.now() - row.time < age ? row.value : null; },
    put(key, value) { cache.delete(key); cache.set(key, { value, time: Date.now() }); if (cache.size > 30) cache.delete(cache.keys().next().value); return value; },
    clearCache() { cache.clear(); }
  };
  window.addEventListener('storage', event => { if (event.key === key) { read(); for (const name of cache.keys()) if (name.startsWith('home:')) cache.delete(name); document.dispatchEvent(new CustomEvent('savedchange')); } });
})();
