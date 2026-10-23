(function() {
  'use strict';

  const views = new Map();
  const pending = new Map();
  let current = document.body.classList.contains('landing') ? 'home' : 'packages';
  let generation = 0;
  const base = new URL('.', location.href);

  function viewKey(url) {
    if (url.origin !== base.origin || url.search || url.hash) return null;
    if (url.pathname === base.pathname || url.pathname === new URL('index.html', base).pathname) return 'home';
    if (url.pathname === new URL('packages.html', base).pathname) return 'packages';
    return null;
  }

  function getNavNodes(root) {
    return [...root.querySelectorAll('main, #back-to-top, #build-menu')];
  }

  views.set(current, {
    nodes: getNavNodes(document),
    scroll: 0
  });

  function initHomeView() {
    const sileoBtn = document.getElementById('sileo');
    if (sileoBtn) {
      sileoBtn.addEventListener('click', () => {
        if (window.RepoUI) {
          RepoUI.copyText('https://ipapplus.github.io').then(() => {
            RepoUI.toast(RepoUI.t('repoUrlCopied'));
          }).catch(() => {});
        }
      });
    }

    const copyRepoBtn = document.getElementById('copy-repo-url');
    if (copyRepoBtn) {
      copyRepoBtn.addEventListener('click', () => {
        if (window.RepoUI) {
          RepoUI.copyText('https://ipapplus.github.io').then(() => {
            RepoUI.toast(RepoUI.t('repoUrlCopied'));
          }).catch(() => {});
        }
      });
    }

    fetch('Packages').then(res => {
      if (!res.ok) throw new Error('Package request failed');
      const lastSeenEl = document.getElementById('last-seen');
      if (lastSeenEl && window.RepoUI) {
        RepoUI.trackModified(lastSeenEl, res.headers.get('Last-Modified'), 'lastSeen');
      }
    }).catch(() => {});
  }

  if (current === 'home') initHomeView();

  async function loadView(view) {
    if (views.has(view)) return views.get(view);
    if (pending.has(view)) return pending.get(view);

    const promise = (async () => {
      const targetUrl = new URL(view === 'home' ? 'index.html' : 'packages.html', base);
      const res = await fetch(targetUrl);
      if (!res.ok) throw new Error('View request failed ' + res.status);
      const htmlText = await res.text();
      const doc = new DOMParser().parseFromString(htmlText, 'text/html');
      const nodes = getNavNodes(doc);
      if (!nodes.length) throw new Error('Invalid view content');

      nodes.forEach(el => {
        el.hidden = true;
        document.body.appendChild(document.adoptNode(el));
      });

      if (view === 'home') {
        initHomeView();
      } else {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = new URL('packages.js?v=2', base);
          script.onload = resolve;
          script.onerror = () => {
            script.remove();
            reject(new Error('Package script failed'));
          };
          document.body.appendChild(script);
        }).catch(err => {
          nodes.forEach(el => el.remove());
          throw err;
        });
      }

      const record = { nodes, scroll: 0 };
      views.set(view, record);
      return record;
    })();

    pending.set(view, promise);
    try {
      return await promise;
    } finally {
      pending.delete(view);
    }
  }

  async function navigateTo(url, isPopState = false) {
    const view = viewKey(url);
    if (!view || view === current) return;

    const token = ++generation;
    try {
      const nextView = await loadView(view);
      if (document.fonts) await document.fonts.ready;
      if (token !== generation) return;

      const prevView = views.get(current);
      if (prevView) prevView.scroll = window.scrollY;

      if (current === 'packages') {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      }

      const activeEl = document.activeElement;
      if (prevView && prevView.nodes.some(el => el.contains(activeEl)) && activeEl instanceof HTMLElement) {
        activeEl.blur();
      }

      document.dispatchEvent(new Event('repoviewwillchange'));

      if (prevView) {
        prevView.nodes.forEach(el => { el.hidden = true; });
      }

      current = view;
      document.body.classList.toggle('landing', view === 'home');
      document.body.classList.toggle('browser-page', view === 'packages');

      nextView.nodes.forEach(el => {
        if (el.id !== 'build-menu') el.hidden = false;
      });

      if (window.RepoUI) {
        RepoUI.setLanguage(RepoUI.lang);
      }

      if (!isPopState) {
        history.pushState(null, '', url.href);
      }

      window.scrollTo(0, isPopState ? nextView.scroll : 0);
      document.dispatchEvent(new Event('repoviewchange'));

      const mainEl = nextView.nodes.find(el => el.tagName === 'MAIN');
      if (mainEl) mainEl.focus({ preventScroll: true });
    } catch (err) {
      if (token === generation && window.RepoUI) {
        RepoUI.toast(RepoUI.t('loadErrorDesc'));
      }
    }
  }

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (!link || link.hasAttribute('download') || link.target) return;
    const url = new URL(link.href, location.href);
    if (!viewKey(url)) return;
    event.preventDefault();
    navigateTo(url);
  });

  window.addEventListener('popstate', () => {
    navigateTo(new URL(location.href), true);
  });
})();
