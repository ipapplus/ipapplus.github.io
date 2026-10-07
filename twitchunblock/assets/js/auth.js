(function () {
  'use strict';
  const config = window.TwitchConfig;
  const key = 'twitchunblock.session';
  const pendingKey = 'twitchunblock.oauth';
  let session = null;
  let message = null;
  let validation = null;
  let generation = 0;
  function read(key) { try { return JSON.parse(sessionStorage.getItem(key)); } catch (_) { return null; } }
  function write(key, value) { sessionStorage.setItem(key, JSON.stringify(value)); }
  function remove(key) { try { sessionStorage.removeItem(key); } catch (_) {} }
  function notify() { document.dispatchEvent(new CustomEvent('authchange')); }
  function clear(reason) { generation++; session = null; remove(key); message = reason || null; notify(); }
  async function request(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
    try { return await fetch(url, { ...options, signal: controller.signal, credentials: 'omit', cache: 'no-store' }); }
    finally { clearTimeout(timeout); }
  }
  let attempt = 0;
  let challenge = null;
  function cancelLogin() { attempt++; challenge = null; message = null; notify(); }
  async function login() {
    cancelLogin(); const active = attempt;
    if (!/^[a-zA-Z0-9]+$/.test(config.clientId)) { message = 'auth.unconfigured'; notify(); return; }
    message = 'data.loading'; notify();
    try {
      const response = await request('https://id.twitch.tv/oauth2/device', { method: 'POST', body: new URLSearchParams({ client_id: config.clientId, scopes: '' }) });
      const data = await response.json();
      const uri = new URL(data.verification_uri);
      if (!response.ok || uri.origin !== 'https://www.twitch.tv' || uri.pathname !== '/activate' ||
          typeof data.device_code !== 'string' || !/^[a-zA-Z0-9_-]{4,2048}$/.test(data.device_code) || typeof data.user_code !== 'string' || !/^[a-zA-Z0-9-]{4,32}$/.test(data.user_code) ||
          !Number.isFinite(data.expires_in) || data.expires_in <= 0 || !Number.isFinite(data.interval) || data.interval < 1) throw new Error();
      if (active !== attempt) return;
      challenge = { url: uri.href, code: data.user_code }; message = 'auth.waiting'; notify();
      const deadline = Date.now() + data.expires_in * 1000;
      let delay = Math.max(5, data.interval) * 1000;
      while (active === attempt && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, delay));
        if (active !== attempt) return;
        const result = await request('https://id.twitch.tv/oauth2/token', { method: 'POST', body: new URLSearchParams({ client_id: config.clientId, scopes: '', device_code: data.device_code, grant_type: 'urn:ietf:params:oauth:grant-type:device_code' }) });
        const body = await result.json();
        if (active !== attempt) return;
        if (result.ok) {
          if (typeof body.access_token !== 'string' || !/^[a-zA-Z0-9]{10,2048}$/.test(body.access_token) || body.token_type?.toLowerCase() !== 'bearer') throw new Error();
          challenge = null; session = { token: body.access_token }; await validate(); notify(); return;
        }
        const reason = body.message || body.error;
        if (reason === 'authorization_pending') continue;
        if (reason === 'slow_down') { delay += 5000; continue; }
        if (reason === 'access_denied') throw new Error('auth.denied');
        throw new Error('auth.failed');
      }
      if (active === attempt) throw new Error('auth.loginExpired');
    } catch (error) {
      if (active !== attempt) return;
      challenge = null; message = ['auth.denied', 'auth.loginExpired'].includes(error.message) ? error.message : 'auth.retry'; notify();
    }
  }
  async function validate() {
    if (!session) return null;
    if (validation) return validation;
    const version = generation;
    const candidate = session;
    validation = (async () => {
      try {
        const response = await request('https://id.twitch.tv/oauth2/validate', { headers: { Authorization: 'OAuth ' + candidate.token } });
        if (response.status === 401) throw new Error('auth.expired');
        if (!response.ok) throw new Error('auth.retry');
        const data = await response.json();
        if (data.client_id !== config.clientId || typeof data.user_id !== 'string' || !/^\d+$/.test(data.user_id) ||
            typeof data.login !== 'string' || !/^[a-zA-Z0-9_]{1,25}$/.test(data.login) ||
            !Number.isFinite(data.expires_in) || data.expires_in <= 0) throw new Error('auth.expired');
        if (version !== generation) return null;
        session = { token: candidate.token, userId: data.user_id, login: data.login, expiresAt: Date.now() + data.expires_in * 1000, validatedAt: Date.now() };
        write(key, session); message = null; if (candidate.userId !== session.userId) notify(); return session;
      } catch (error) {
        if (version === generation) clear(error.message === 'auth.expired' ? 'auth.expired' : 'auth.retry');
        return null;
      }
    })();
    try { return await validation; } finally { validation = null; }
  }
  async function token() {
    if (!session) throw new Error(message || (config.clientId ? 'auth.required' : 'auth.unconfigured'));
    if (session.expiresAt <= Date.now()) { clear('auth.expired'); throw new Error('auth.expired'); }
    if (Date.now() - session.validatedAt >= 3600000) await validate();
    if (!session) throw new Error(message || 'auth.expired');
    return session.token;
  }
  async function initialize() {
    // Reject legacy OAuth callbacks; this public client uses device authorization.
    const fragment = new URLSearchParams(location.hash.slice(1));
    if (fragment.has('access_token') || fragment.has('error') || new URLSearchParams(location.search).has('code') || new URLSearchParams(location.search).has('error')) {
      history.replaceState(null, '', location.pathname + '#home'); clear('auth.failed'); return;
    }
    remove(pendingKey);
    const stored = read(key);
    if (config.clientId && stored && typeof stored.token === 'string' && /^[a-zA-Z0-9]{10,2048}$/.test(stored.token)) { session = stored; await validate(); }
    else { remove(key); notify(); }
  }

  function logout() {
    const oldToken = session?.token;
    cancelLogin(); clear(); remove(pendingKey);
    // Local session ends immediately even if revocation is offline.
    if (oldToken) request('https://id.twitch.tv/oauth2/revoke', { method: 'POST', body: new URLSearchParams({ client_id: config.clientId, token: oldToken }) }).catch(() => {});
  }
  window.TwitchAuth = { initialize, login, cancelLogin, get challenge() { return challenge; }, token, validate, logout, invalidate: () => clear('auth.expired'), get session() { return session; }, get message() { return message; } };
  setInterval(() => { if (session) { if (session.expiresAt <= Date.now()) clear('auth.expired'); else if (Date.now() - session.validatedAt >= 3600000) validate(); } }, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && session) token().catch(() => {}); });
})();
