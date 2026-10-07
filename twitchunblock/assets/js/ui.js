(function () {
  'use strict';
  const t = (key, values) => window.TwitchI18n.t(key, values);
  function el(tag, className, content) { const node = document.createElement(tag); if (className) node.className = className; if (content !== undefined) node.textContent = content; return node; }
  function name(value) { const node = el('bdi', '', value); node.dir = 'ltr'; return node; }
  function avatar(url) { const node = el('img', 'channel-avatar'); node.alt = ''; node.width = 48; node.height = 48; const safe = window.TwitchAPI.image(url); node.src = safe || '/twitchunblock/assets/app-icon.png'; node.loading = 'lazy'; node.decoding = 'async'; node.addEventListener('error', () => { node.src = '/twitchunblock/assets/app-icon.png'; }, { once: true }); return node; }
  function errorKey(error) { const key = error?.key || error?.message; return /^(?:api\.(?:timeout|rateLimit|malformed|failed)|auth\.(?:required|unconfigured|expired|failed|denied|retry)|channel\.notFound)$/.test(key) ? key : 'api.failed'; }
  function status(node, key) { node.textContent = key ? t(key) : ''; node.hidden = !key; }
  function number(value) { return new Intl.NumberFormat(window.TwitchI18n.language).format(value); }
  function date(value) { return new Intl.DateTimeFormat(window.TwitchI18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
  function uptime(started) { const seconds=Math.max(0,Math.floor((Date.now()-Date.parse(started))/1000));return Math.floor(seconds/3600)+':'+String(Math.floor(seconds%3600/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0'); }
  function streamInfo(channel) {
    const fragment = document.createDocumentFragment();
    fragment.append(el('span', channel.stream ? 'pill live-pill' : 'pill', t(channel.stream ? 'channel.live' : 'channel.offline')));
    const stream = channel.stream;
    if (stream?.title || channel.title) { const title = el('p', 'stream-title', stream?.title || channel.title); title.dir = 'auto'; fragment.append(title); }
    if (stream?.game || channel.game) { const p = el('p', 'small-note'); p.append(t('channel.game') + ': ', el('bdi', '', stream?.game || channel.game)); fragment.append(p); }
    if (stream) {
      const p = el('p', 'small-note'); const clock = name(uptime(stream.started)); clock.dataset.streamStarted = stream.started;clock.title=t('p0.durationFormat'); p.append(t('channel.viewers', { count: number(stream.viewers) }), ' · ', t('channel.uptime') + ': ', clock); fragment.append(p);
    }
    return fragment;
  }
  function thumbnail(url, className = 'preview') {
    const box = el('div', className);
    const safe = window.TwitchAPI.image(url);
    if (safe) { const img = el('img'); img.src = safe; img.alt = ''; img.width = 640; img.height = 360; img.loading = 'lazy'; img.decoding = 'async'; img.addEventListener('error', () => img.remove(), { once: true }); box.append(img); }
    return box;
  }
  function channelCard(channel, historical = false) {
    const article = el('article', 'channel-card');
    const link = el('a', 'channel-link'); link.href = '#channel/' + encodeURIComponent(channel.login);
    if (channel.stream) { link.classList.add('with-preview'); const preview = thumbnail(channel.stream.thumbnail); const badge = el('span','pill live-pill',t('channel.live')); preview.append(badge); link.append(preview); }
    const identity = el('div', 'card-identity'); identity.append(avatar(channel.avatar));
    const heading = el('div'); heading.append(el('h3')); heading.firstChild.append(name(channel.name)); heading.append(name('@' + channel.login)); identity.append(heading); link.append(identity);
    if (historical) link.append(el('p', 'small-note', Number.isFinite(channel.opened) ? t('history.opened', { date: date(channel.opened) }) : t('p0.savedHint')));
    else link.append(streamInfo(channel));
    article.append(link); return article;
  }
  function grid(container, rows, historical = false) { const focused=container.contains(document.activeElement)?document.activeElement.closest('a')?.getAttribute('href'):null;container.replaceChildren(...rows.map(row => channelCard(row, historical)));if(focused)[...container.querySelectorAll('a')].find(a=>a.getAttribute('href')===focused)?.focus({preventScroll:true}); }
  function compact(container, rows) {
    container.replaceChildren(...rows.map(row => { const a = el('a','recent-chip'); a.href = '#channel/' + row.login; a.append(avatar(row.avatar), name(row.name)); return a; }));
  }
  function skeleton(container, count = 4) {
    container.replaceChildren(...Array.from({ length: count }, () => { const card = el('div','skeleton-card'); card.setAttribute('aria-hidden','true'); card.append(el('div','preview'),el('div','skeleton-line'),el('div','skeleton-line short')); return card; }));
  }
  function mediaCard(item) {
    const article = el('article','media-card'); const a = el('a','media-link'); a.href = item.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    const preview = thumbnail(item.thumbnail); if (item.duration) preview.append(name(item.duration)); a.append(preview);
    const title = el('h3','media-title',item.title || t('media.untitled')); title.dir = 'auto'; a.append(title);
    a.append(el('span','small-note',t('p0.external'))); article.append(a);
    const details = el('p','small-note'); details.append(date(item.created),' · ',t('media.views',{count:number(item.views)})); article.append(details); return article;
  }
  setInterval(() => { if (!document.hidden) document.querySelectorAll('[data-stream-started]').forEach(node => node.textContent = uptime(node.dataset.streamStarted)); }, 1000);
  window.TwitchUI = { t, el, name, avatar, errorKey, status, number, date, streamInfo, grid, thumbnail, compact, skeleton, mediaCard };
})();
