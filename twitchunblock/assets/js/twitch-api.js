(function () {
  'use strict';
  const config = window.TwitchConfig;
  class APIError extends Error { constructor(key) { super(key); this.key = key; } }
  const malformed = () => { throw new APIError('api.malformed'); };
  function text(value) { if (typeof value !== 'string') malformed(); return value.slice(0, 2000); }
  function id(value) { if (typeof value !== 'string' || !/^\d+$/.test(value)) malformed(); return value; }
  function login(value) { if (typeof value !== 'string' || !/^[a-zA-Z0-9_]{1,25}$/.test(value)) malformed(); return value.toLowerCase(); }
  function image(value) {
    if (typeof value !== 'string') return '';
    try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && (url.hostname === 'jtvnw.net' || url.hostname.endsWith('.jtvnw.net') || url.hostname === 'twitchcdn.net' || url.hostname.endsWith('.twitchcdn.net')) ? url.href : ''; } catch (_) { return ''; }
  }
  function count(value) { if (!Number.isSafeInteger(value) || value < 0) malformed(); return value; }
  function date(value) { if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) malformed(); return value; }
  async function get(resource, params = {}, signal) {
    let access;
    try { access = await window.TwitchAuth.token(); } catch (error) { throw new APIError(error.message); }
    const url = new URL('https://api.twitch.tv/helix/' + resource);
    for (const [name, values] of Object.entries(params)) for (const value of Array.isArray(values) ? values : [values]) url.searchParams.append(name, value);
    const controller = new AbortController();
    const cancel = () => controller.abort();
    if (signal?.aborted) cancel(); else signal?.addEventListener('abort', cancel, { once: true });
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; cancel(); }, config.timeoutMs);
    try {
      const response = await fetch(url, { headers: { 'Client-Id': config.clientId, Authorization: 'Bearer ' + access }, credentials: 'omit', cache: 'no-store', signal: controller.signal });
      if (response.status === 401) { window.TwitchAuth.invalidate(); throw new APIError('auth.expired'); }
      if (response.status === 429) throw new APIError('api.rateLimit');
      if (!response.ok) throw new APIError('api.failed');
      let json; try { json = await response.json(); } catch (_) { malformed(); }
      if (!json || !Array.isArray(json.data) || json.data.length > 100 || json.data.some(row => !row || typeof row !== 'object' || Array.isArray(row))) malformed();
      return json.data;
    } catch (error) {
      if (signal?.aborted) throw new APIError('api.cancelled');
      if (error instanceof APIError) throw error;
      throw new APIError(timedOut ? 'api.timeout' : 'api.failed');
    } finally { clearTimeout(timeout); signal?.removeEventListener('abort', cancel); }
  }
  function user(raw) { return { id: id(raw.id), login: login(raw.login), name: text(raw.display_name), avatar: image(raw.profile_image_url), description: text(raw.description) }; }
  function stream(raw) { return { userId: id(raw.user_id), login: login(raw.user_login), name: text(raw.user_name), title: text(raw.title), game: text(raw.game_name), viewers: count(raw.viewer_count), started: date(raw.started_at) }; }
  async function users(params, signal) { return (await get('users', params, signal)).map(user); }
  async function streams(params, signal) { return (await get('streams', params, signal)).map(stream); }
  async function home(signal) {
    const live = await streams({ first: 12 }, signal);
    if (!live.length) return [];
    const profiles = await users({ id: live.map(s => s.userId) }, signal);
    return live.map(s => { const profile = profiles.find(u => u.id === s.userId); if (!profile) malformed(); return { ...profile, stream: s }; });
  }
  async function search(query, liveOnly, signal) {
    const rows = await get('search/channels', { query, first: 20, live_only: liveOnly }, signal);
    const found = rows.map(r => {
      if (typeof r.is_live !== 'boolean') malformed();
      return { id: id(r.id), login: login(r.broadcaster_login), name: text(r.display_name), avatar: image(r.thumbnail_url), title: text(r.title), game: text(r.game_name), isLive: r.is_live };
    });
    // Search only indexes recently active channels; exact login lookup also finds older offline accounts.
    if (!liveOnly && /^[a-zA-Z0-9_]{1,25}$/.test(query)) {
      const exact = await users({ login: query.toLowerCase() }, signal);
      if (exact.length && !found.some(u => u.id === exact[0].id)) found.unshift(exact[0]);
    }
    if (!found.length) return [];
    const live = await streams({ user_id: found.map(u => u.id) }, signal);
    return found.map(u => ({ ...u, stream: live.find(s => s.userId === u.id) || null })).filter(u => !liveOnly || u.stream);
  }
  async function channel(channelLogin, signal) {
    const profiles = await users({ login: channelLogin }, signal);
    if (!profiles.length) throw new APIError('channel.notFound');
    const profile = profiles[0];
    const [live, details] = await Promise.all([streams({ user_id: profile.id }, signal), get('channels', { broadcaster_id: profile.id }, signal)]);
    if (!details.length || id(details[0].broadcaster_id) !== profile.id || live.some(s => s.userId !== profile.id)) malformed();
    return { ...profile, title: text(details[0].title), game: text(details[0].game_name), stream: live[0] || null };
  }
  async function videos(userId, signal) {
    return (await get('videos', { user_id: userId, type: 'archive', first: 6 }, signal)).map(r => ({ id: id(r.id), title: text(r.title), created: date(r.created_at), duration: text(r.duration), views: count(r.view_count), url: 'https://www.twitch.tv/videos/' + r.id }));
  }
  async function clips(userId, signal) {
    return (await get('clips', { broadcaster_id: userId, first: 6 }, signal)).map(r => {
      const clipId = text(r.id); if (!/^[a-zA-Z0-9_-]+$/.test(clipId)) malformed();
      return { id: clipId, title: text(r.title), created: date(r.created_at), views: count(r.view_count), url: 'https://clips.twitch.tv/' + clipId };
    });
  }
  window.TwitchAPI = { home, search, channel, videos, clips, users, image, login, APIError };
})();
