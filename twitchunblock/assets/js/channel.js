(function () {
  'use strict';
  const ui = window.TwitchUI;
  const heading = document.getElementById('channel-heading');
  const profile = document.getElementById('channel-profile');
  const status = document.getElementById('channel-state');
  const collections = ['videos','clips'];
  let current = null;
  let state = null;
  let controller = null;
  let media = {};
  function render() {
    ui.status(status, state);
    heading.replaceChildren(current ? ui.name(current.name) : document.createTextNode(ui.t('channel.heading')));
    profile.replaceChildren();
    if (current) {
      const identity = ui.el('div', 'project-heading');
      identity.append(ui.avatar(current.avatar), ui.name('@' + current.login)); profile.append(identity, ui.streamInfo(current));
      if (current.description) { const p = ui.el('p', 'channel-description', current.description); p.dir = 'auto'; profile.append(p); }
      const link = ui.el('a', 'button', ui.t('channel.openTwitch')); link.href = 'https://www.twitch.tv/' + current.login; link.target = '_blank'; link.rel = 'noopener noreferrer'; profile.append(link);
    }
    for (const type of collections) {
      const container = document.getElementById('channel-' + type);
      container.replaceChildren();
      const section = container.closest('section'); section.hidden = !current;
      if (!current) continue;
      const record = media[type];
      if (!record?.rows?.length) { container.append(ui.el('p', 'small-note', ui.t(record?.state || 'data.loading'))); continue; }
      for (const item of record.rows) {
        const article = ui.el('article', 'media-card'); const a = ui.el('a', 'media-link', item.title || ui.t('media.untitled')); a.dir = 'auto'; a.href = item.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
        const details = ui.el('p', 'small-note'); details.append(ui.date(item.created), ' · ', ui.t('media.views', { count: ui.number(item.views) }));
        if (item.duration) details.append(' · ', ui.name(item.duration));
        article.append(a, details); container.append(article);
      }
    }
  }
  function cancel() { controller?.abort(); controller = null; profile.setAttribute('aria-busy', 'false'); }
  async function open(login) {
    cancel(); controller = new AbortController(); const active = controller;
    current = null; media = {}; state = 'data.loading'; render(); profile.setAttribute('aria-busy', 'true');
    try {
      const found = await window.TwitchAPI.channel(login, active.signal);
      if (controller !== active) return;
      current = found; state = null; window.TwitchHistory.add(found); render();
      // Independent collections preserve useful channel information if only one endpoint fails.
      await Promise.all(collections.map(async type => {
        try { const rows = await window.TwitchAPI[type](found.id, active.signal); if (controller !== active) return; media[type] = { rows, state: rows.length ? null : 'media.empty.' + type }; }
        catch (error) { if (controller !== active || active.signal.aborted) return; media[type] = { state: ui.errorKey(error) }; }
        if (controller === active) render();
      }));
    } catch (error) { if (controller !== active || active.signal.aborted) return; state = ui.errorKey(error); render(); }
    finally { if (controller === active) profile.setAttribute('aria-busy', 'false'); }
  }
  function reset() { cancel(); current = null; media = {}; state = null; render(); }
  document.addEventListener('languagechange', render);
  window.TwitchChannel = { open, cancel, reset };
})();
