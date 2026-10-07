(function () {
  'use strict';
  const t = (key, values) => window.TwitchI18n.t(key, values);
  function el(tag, className, content) { const node = document.createElement(tag); if (className) node.className = className; if (content !== undefined) node.textContent = content; return node; }
  function name(value) { const node = el('bdi', '', value); node.dir = 'ltr'; return node; }
  function avatar(url) { const node = el('img', 'channel-avatar'); node.alt = ''; node.width = 48; node.height = 48; const safe = window.TwitchAPI.image(url); node.src = safe || '/twitchunblock/assets/app-icon.png'; node.referrerPolicy = 'no-referrer'; node.addEventListener('error', () => { node.src = '/twitchunblock/assets/app-icon.png'; }, { once: true }); return node; }
  function errorKey(error) { const key = error?.key || error?.message; return /^(?:api\.(?:timeout|rateLimit|malformed|failed)|auth\.(?:required|unconfigured|expired|failed|denied|retry)|channel\.notFound)$/.test(key) ? key : 'api.failed'; }
  function status(node, key) { node.textContent = key ? t(key) : ''; node.hidden = !key; }
  function number(value) { return new Intl.NumberFormat(window.TwitchI18n.language).format(value); }
  function date(value) { return new Intl.DateTimeFormat(window.TwitchI18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
  function uptime(started) { const mins = Math.max(0, Math.floor((Date.now() - Date.parse(started)) / 60000)); return Math.floor(mins / 60) + ':' + String(mins % 60).padStart(2, '0'); }
  function streamInfo(channel) {
    const fragment = document.createDocumentFragment();
    fragment.append(el('span', channel.stream ? 'pill live-pill' : 'pill', t(channel.stream ? 'channel.live' : 'channel.offline')));
    const stream = channel.stream;
    if (stream?.title || channel.title) { const title = el('p', 'stream-title', stream?.title || channel.title); title.dir = 'auto'; fragment.append(title); }
    if (stream?.game || channel.game) { const p = el('p', 'small-note'); p.append(t('channel.game') + ': ', el('bdi', '', stream?.game || channel.game)); fragment.append(p); }
    if (stream) {
      const p = el('p', 'small-note'); const clock = name(uptime(stream.started)); clock.dataset.streamStarted = stream.started; p.append(t('channel.viewers', { count: number(stream.viewers) }), ' · ', t('channel.uptime') + ': ', clock); fragment.append(p);
    }
    return fragment;
  }
  function channelCard(channel, historical = false) {
    const article = el('article', 'channel-card');
    const link = el('a', 'channel-link'); link.href = '#channel/' + encodeURIComponent(channel.login);
    link.append(avatar(channel.avatar));
    const heading = el('div'); heading.append(el('h3')); heading.firstChild.append(name(channel.name)); heading.append(name('@' + channel.login)); link.append(heading);
    article.append(link);
    if (historical) article.append(el('p', 'small-note', t('history.opened', { date: date(channel.opened) })));
    else article.append(streamInfo(channel));
    return article;
  }
  function grid(container, rows, historical = false) { container.replaceChildren(...rows.map(row => channelCard(row, historical))); }
  setInterval(() => { if (!document.hidden) document.querySelectorAll('[data-stream-started]').forEach(node => node.textContent = uptime(node.dataset.streamStarted)); }, 60000);
  window.TwitchUI = { t, el, name, avatar, errorKey, status, number, date, streamInfo, grid };
})();
