(function () {
  'use strict';
  const repository = 'https://github.com/ipapplus/TwitchUnblock';
  const releases = repository + '/releases';
  const endpoint = 'https://api.github.com/repos/ipapplus/TwitchUnblock/releases/latest';
  let publishedAt = null;
  let refreshTimer = null;
  let requestController = null;

  function releaseURL(value, asset) {
    if (typeof value !== 'string') return null;
    try {
      const url = new URL(value);
      const prefix = asset ? '/ipapplus/TwitchUnblock/releases/download/' : '/ipapplus/TwitchUnblock/releases/tag/';
      return url.origin === 'https://github.com' && !url.username && !url.password &&
        url.pathname.startsWith(prefix) && url.pathname.length > prefix.length ? url.href : null;
    } catch (_) { return null; }
  }

  function selectIPA(assets) {
    if (!Array.isArray(assets)) return null;
    const candidates = assets.filter(asset => asset && typeof asset.name === 'string' &&
      /^TwitchUnblock(?:[-_.]v?\d[\w.-]*)?\.ipa$/i.test(asset.name) &&
      asset.state === 'uploaded' && releaseURL(asset.browser_download_url, true));
    const exact = candidates.filter(asset => /^TwitchUnblock\.ipa$/i.test(asset.name));
    // Prefer the actual app asset, never another project's IPA or a test build.
    // Ambiguous alternatives fall back to the release page instead of guessing.
    return exact.length === 1 ? exact[0] : candidates.length === 1 ? candidates[0] : null;
  }

  function relativeTime(date, now) {
    const seconds = Math.max(0, Math.floor((now - date.getTime()) / 1000));
    if (seconds < 60) return 'Just now';
    const units = [[31536000, 'year'], [2592000, 'month'], [604800, 'week'], [86400, 'day'], [3600, 'hour'], [60, 'minute']];
    const unit = units.find(entry => seconds >= entry[0]);
    const count = Math.floor(seconds / unit[0]);
    if (typeof Intl.RelativeTimeFormat === 'function') {
      return new Intl.RelativeTimeFormat('en', { numeric: 'always' }).format(-count, unit[1]);
    }
    return count + ' ' + unit[1] + (count === 1 ? '' : 's') + ' ago';
  }

  function updateAge() {
    if (publishedAt) document.getElementById('release-age').textContent = relativeTime(publishedAt, Date.now());
  }
  function scheduleAge() {
    clearInterval(refreshTimer);
    refreshTimer = null;
    if (!document.hidden && publishedAt) {
      updateAge();
      refreshTimer = setInterval(updateAge, 60000);
    }
  }
  function downloads(url, asset) {
    document.querySelectorAll('[data-ipa-link]').forEach(link => {
      link.href = url;
      link.querySelector('[data-download-label]').textContent = asset ? 'Download IPA' : 'View Releases';
      if (asset) link.setAttribute('aria-label', 'Download ' + asset.name);
      else link.removeAttribute('aria-label');
    });
  }
  function fallback() {
    downloads(releases + '/latest', null);
    document.getElementById('release-status').textContent = 'Release details couldn’t be loaded. GitHub Releases has the latest IPA.';
    document.getElementById('download-note').textContent = 'Open GitHub Releases to choose the latest IPA.';
  }

  async function loadRelease() {
    requestController = new AbortController();
    const controller = requestController;
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(endpoint, {
        headers: { Accept: 'application/vnd.github+json' },
        credentials: 'omit', signal: controller.signal
      });
      if (!response.ok) throw new Error('Release unavailable');
      const release = await response.json();
      const releaseLink = releaseURL(release.html_url, false);
      const date = new Date(release.published_at);
      if (release.draft || release.prerelease || typeof release.tag_name !== 'string' || !release.tag_name.trim() ||
          !releaseLink || typeof release.published_at !== 'string' || !Number.isFinite(date.getTime())) throw new Error('Invalid release');
      const title = typeof release.name === 'string' && release.name.trim() ? release.name.trim() : release.tag_name;
      document.getElementById('release-version').textContent = title;
      const tag = document.getElementById('release-tag');
      tag.textContent = release.tag_name;
      tag.href = releaseLink;
      const time = document.getElementById('release-date');
      time.dateTime = date.toISOString();
      time.textContent = new Intl.DateTimeFormat('en', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
      publishedAt = date;
      document.getElementById('release-details').hidden = false;
      scheduleAge();
      const asset = selectIPA(release.assets);
      downloads(asset ? asset.browser_download_url : releaseLink, asset);
      document.getElementById('release-status').textContent = asset ? 'Published by ipapplus/TwitchUnblock.' : 'No single app IPA could be selected. View the release to choose an asset.';
      document.getElementById('download-note').textContent = asset ? 'Direct GitHub release asset: ' + asset.name : 'Choose an available IPA from the release page.';
    } catch (_) { fallback(); }
    finally {
      clearTimeout(timeout);
      if (requestController === controller) requestController = null;
    }
  }

  document.addEventListener('visibilitychange', scheduleAge);
  window.addEventListener('pagehide', () => {
    clearInterval(refreshTimer);
    refreshTimer = null;
    if (requestController) requestController.abort();
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted) {
      scheduleAge();
      if (!publishedAt && !requestController) loadRelease();
    }
  });
  loadRelease();
})();
