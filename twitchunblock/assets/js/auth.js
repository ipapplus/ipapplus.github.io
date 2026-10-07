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
  function authorizationURL() {
    if (!/^[a-zA-Z0-9]+$/.test(config.clientId)) throw new Error('auth.unconfigured');
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const state = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    // Fail closed if the pending state cannot survive the redirect.
    write(pendingKey, { state, created: Date.now(), clientId: config.clientId });
    const url = new URL('https://id.twitch.tv/oauth2/authorize');
    url.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.redirectUri, response_type: 'token', scope: '', state });
    return url.href;
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
    const fragment = new URLSearchParams(location.hash.slice(1));
    const query = new URLSearchParams(location.search);
    const callback = fragment.has('access_token') || fragment.has('error') || query.has('error') || query.has('code');
    if (callback) {
      // Remove returned credentials/errors from the address bar before any API or image request.
      history.replaceState(null, '', location.pathname + '#home');
      const pending = read(pendingKey); remove(pendingKey);
      const params = fragment.has('access_token') || fragment.has('error') ? fragment : query;
      if (!pending || !pending.state || params.get('state') !== pending.state || pending.clientId !== config.clientId ||
          Date.now() - pending.created > 600000 || pending.created > Date.now()) { clear('auth.failed'); return; }
      if (params.has('error')) { clear('auth.denied'); return; }
      const received = params.get('access_token');
      if (!received || !/^[a-zA-Z0-9]{10,2048}$/.test(received) || params.get('token_type')?.toLowerCase() !== 'bearer') { clear('auth.failed'); return; }
      session = { token: received }; await validate();
    } else {
      const stored = read(key);
      if (config.clientId && stored && typeof stored.token === 'string' && /^[a-zA-Z0-9]{10,2048}$/.test(stored.token)) { session = stored; await validate(); }
      else { remove(key); notify(); }
    }
  }
  function logout() {
    const oldToken = session?.token;
    clear(); remove(pendingKey);
    // Local session ends immediately even if revocation is offline.
    if (oldToken) request('https://id.twitch.tv/oauth2/revoke', { method: 'POST', body: new URLSearchParams({ client_id: config.clientId, token: oldToken }) }).catch(() => {});
  }
  window.TwitchAuth = { initialize, authorizationURL, token, validate, logout, invalidate: () => clear('auth.expired'), get session() { return session; }, get message() { return message; } };
  setInterval(() => { if (session) { if (session.expiresAt <= Date.now()) clear('auth.expired'); else if (Date.now() - session.validatedAt >= 3600000) validate(); } }, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && session) token().catch(() => {}); });
})();
