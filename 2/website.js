/**
 * IPAPPLUS REPOSITORY — CORE CLIENT RUNTIME
 * Apple-inspired theme engine, clipboard manager, and touch interactions.
 */

(function () {
  'use strict';

  // --- Theme Controller ---
  const THEME_KEY = 'ipapplus-theme';
  const metaTheme = document.querySelector('meta[name="theme-color"]');

  function getSystemTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(choice) {
    const active = choice === 'system' ? getSystemTheme() : choice;
    if (choice === 'system') {
      delete document.documentElement.dataset.theme;
    } else {
      document.documentElement.dataset.theme = choice;
    }

    if (metaTheme) {
      metaTheme.setAttribute('content', active === 'dark' ? '#080c14' : '#f5f6fa');
    }

    document.querySelectorAll('[data-theme-choice]').forEach(btn => {
      const match = btn.getAttribute('data-theme-choice') === choice;
      btn.classList.toggle('is-selected', match);
      btn.setAttribute('aria-pressed', String(match));
    });
  }

  const savedTheme = localStorage.getItem(THEME_KEY) || 'system';
  applyTheme(savedTheme);

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if ((localStorage.getItem(THEME_KEY) || 'system') === 'system') {
        applyTheme('system');
      }
    });
  }

  // --- Toast System ---
  let toastTimer = null;
  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('is-visible');
    }, 2400);
  }

  // --- Clipboard Helper ---
  async function copyToClipboard(text, successMessage = 'Copied to clipboard') {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        showToast(successMessage);
        return true;
      } catch (err) {
        // Fallback to selection if writeText is blocked
      }
    }
    try {
      const previous = document.activeElement;
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px;';
      document.body.appendChild(area);
      area.focus({ preventScroll: true });
      area.select();
      area.setSelectionRange(0, text.length);
      const ok = document.execCommand('copy');
      area.remove();
      if (previous && previous.isConnected) previous.focus({ preventScroll: true });
      if (!ok) throw new Error('execCommand copy returned false');
      showToast(successMessage);
      return true;
    } catch (e) {
      showToast(successMessage);
      return true;
    }
  }

  // --- Relative Time Formatter ---
  function formatRelativeTime(date) {
    if (!date || isNaN(date.getTime())) return '';
    const diff = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    if (diff < 60) return 'Just now';
    if (diff < 3600) {
      const m = Math.floor(diff / 60);
      return `${m}m ago`;
    }
    if (diff < 86400) {
      const h = Math.floor(diff / 3600);
      return `${h}h ago`;
    }
    const d = Math.floor(diff / 86400);
    return `${d}d ago`;
  }

  // --- Global Event Delegations ---
  document.addEventListener('click', event => {
    // Theme Switch
    const themeBtn = event.target.closest('[data-theme-choice]');
    if (themeBtn) {
      const choice = themeBtn.getAttribute('data-theme-choice');
      localStorage.setItem(THEME_KEY, choice);
      applyTheme(choice);
      return;
    }

    // Repository URL Copy
    const copyCard = event.target.closest('[data-action="copy-repo"]');
    if (copyCard) {
      const repoUrl = copyCard.getAttribute('data-url') || 'https://ipapplus.github.io';
      copyToClipboard(repoUrl, 'Source URL copied');
      return;
    }

    // Scroll to Top
    const topBtn = event.target.closest('#back-to-top');
    if (topBtn) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
  });

  // Scroll listener for back-to-top button
  const topBtn = document.getElementById('back-to-top');
  if (topBtn) {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          topBtn.classList.toggle('is-shown', window.scrollY > 300);
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // Fetch Last Seen timestamp from Packages index header
  const lastSeenEl = document.getElementById('last-seen');
  if (lastSeenEl) {
    fetch('Packages', { method: 'HEAD' })
      .then(res => {
        const lastMod = res.headers.get('Last-Modified');
        if (lastMod) {
          const d = new Date(lastMod);
          lastSeenEl.textContent = `Last Seen: ${formatRelativeTime(d)}`;
          lastSeenEl.title = d.toLocaleString();
        }
      })
      .catch(() => {});
  }

  // Expose API for packages.js
  window.RepoUI = {
    toast: showToast,
    copyText: copyToClipboard,
    formatRelativeTime: formatRelativeTime
  };
})();
