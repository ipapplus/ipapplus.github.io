(function () {
  'use strict';
  const ui = window.TwitchUI;
  const form = document.getElementById('search-form');
  const input = document.getElementById('channel');
  const status = document.getElementById('search-state');
  const results = document.getElementById('search-results');
  let rows = [];
  let state = 'search.prompt';
  let controller;
  let busy = false;
  function render() { ui.status(status, state); ui.grid(results, rows); form.querySelector('[type="submit"]').disabled = busy; results.setAttribute('aria-busy', String(busy)); }
  async function submit(event) {
    event?.preventDefault();
    controller?.abort(); controller = new AbortController(); const active = controller;
    const query = input.value.trim().replace(/^@/, '');
    if (!query) { rows = []; busy = false; state = 'search.empty'; render(); input.focus(); return; }
    if (query.length > 100) { rows = []; busy = false; state = 'search.invalid'; render(); return; }
    busy = true; rows = []; state = 'data.loading'; render();
    try {
      const found = await window.TwitchAPI.search(query, document.getElementById('live-only').checked, active.signal);
      if (controller !== active) return;
      rows = found; state = rows.length ? null : 'search.noResults';
    } catch (error) { if (controller !== active || active.signal.aborted) return; state = ui.errorKey(error); }
    finally { if (controller === active) { busy = false; render(); } }
  }
  function reset() { controller?.abort(); controller = null; rows = []; busy = false; state = window.TwitchAuth.message || 'search.prompt'; render(); }
  form.addEventListener('submit', submit);
  document.addEventListener('languagechange', render);
  window.TwitchSearch = { submit, reset };
  render();
})();
