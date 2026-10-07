(function () {
  'use strict';
  const key = 'twitchunblock.history';
  let memory = [];
  let storageOK = true;
  let initialized = false;
  function valid(row) { return row && typeof row.login === 'string' && /^[a-zA-Z0-9_]{1,25}$/.test(row.login) && typeof row.name === 'string' && typeof row.avatar === 'string' && Number.isFinite(row.opened) && row.opened > 0; }
  function list(force = false) {
    if (initialized && !force) return memory;
    initialized = true;
    try { const saved = JSON.parse(localStorage.getItem(key) || '[]'); if (Array.isArray(saved)) memory = saved.filter(valid).slice(0, 50).map(r => ({ login: r.login, name: r.name.slice(0, 200), avatar: window.TwitchAPI.image(r.avatar), opened: r.opened })); }
    catch (_) { storageOK = false; }
    return memory;
  }
  function save() { try { localStorage.setItem(key, JSON.stringify(memory)); storageOK = true; } catch (_) { storageOK = false; } document.dispatchEvent(new CustomEvent('historychange')); }
  function add(channel) { memory = [{ login: channel.login, name: channel.name, avatar: channel.avatar, opened: Date.now() }, ...list().filter(r => r.login !== channel.login)].slice(0, 50); save(); }
  function clear() { memory = []; try { localStorage.removeItem(key); storageOK = true; } catch (_) { storageOK = false; } document.dispatchEvent(new CustomEvent('historychange')); }
  window.TwitchHistory = { list, add, clear, get storageOK() { return storageOK; } };
  window.addEventListener('storage', event => { if (event.key === key) { list(true); document.dispatchEvent(new CustomEvent('historychange')); } });
})();
