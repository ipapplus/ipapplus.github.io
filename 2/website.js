/**
 * IPAPPLUS — Modern Premium Tech Platform
 * Theme, Clipboard, and Interaction Runtime
 */

(() => {
  'use strict';

  const STORAGE_KEY_THEME = 'ipapplus-theme';
  const REPO_URL = 'https://ipapplus.github.io';

  // 1. Theme Controller (System / Dark / Light)
  const themeButtons = document.querySelectorAll('[data-theme-choice]');
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');

  function getSystemTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(choice) {
    const effective = choice === 'system' ? getSystemTheme() : choice;
    document.documentElement.dataset.theme = effective;

    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', effective === 'dark' ? '#050a12' : '#f8fafc');
    }

    themeButtons.forEach(btn => {
      const match = btn.getAttribute('data-theme-choice') === choice;
      btn.classList.toggle('is-active', match);
      btn.setAttribute('aria-pressed', match ? 'true' : 'false');
    });
  }

  function setTheme(choice) {
    try {
      localStorage.setItem(STORAGE_KEY_THEME, choice);
    } catch (e) {}
    applyTheme(choice);
  }

  let activeThemeChoice = 'dark';
  try {
    activeThemeChoice = localStorage.getItem(STORAGE_KEY_THEME) || 'dark';
  } catch (e) {}

  applyTheme(activeThemeChoice);

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      let current = 'dark';
      try {
        current = localStorage.getItem(STORAGE_KEY_THEME) || 'dark';
      } catch (e) {}
      if (current === 'system') {
        applyTheme('system');
      }
    });
  }

  themeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.getAttribute('data-theme-choice');
      if (val) setTheme(val);
    });
  });

  // 2. Toast Notification Controller
  let toastTimer = null;
  const toastElement = document.getElementById('app-toast');

  function showToast(message) {
    if (!toastElement) return;
    toastElement.innerHTML = `
      <span class="status-dot-pulse"></span>
      <span>${message}</span>
    `;
    toastElement.classList.add('is-shown');

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastElement.classList.remove('is-shown');
    }, 2400);
  }

  // 3. Clipboard Action
  const copyButtons = document.querySelectorAll('[data-action="copy-repo"]');
  copyButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      let copied = false;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(REPO_URL);
          copied = true;
        }
      } catch (e) {}

      if (!copied) {
        try {
          const temp = document.createElement('textarea');
          temp.value = REPO_URL;
          temp.setAttribute('readonly', '');
          temp.style.position = 'fixed';
          temp.style.left = '-9999px';
          document.body.appendChild(temp);
          temp.select();
          copied = document.execCommand('copy');
          document.body.removeChild(temp);
        } catch (e) {}
      }

      if (copied) {
        showToast('Repository endpoint copied to clipboard');
      } else {
        showToast('Repository URL: ' + REPO_URL);
      }
    });
  });

  // 4. Touch Tactile Feedback
  const touchSelector = '.cta-shimmer-btn, .btn-tech-secondary, .btn-copy-chip, .arch-filter-btn, .appearance-btn';
  document.addEventListener('pointerdown', (e) => {
    const el = e.target.closest(touchSelector);
    if (el) el.classList.add('is-pressed');
  }, { passive: true });

  const resetTouch = (e) => {
    const el = e.target.closest(touchSelector);
    if (el) el.classList.remove('is-pressed');
  };
  document.addEventListener('pointerup', resetTouch, { passive: true });
  document.addEventListener('pointercancel', resetTouch, { passive: true });

  // Expose helpers
  window.IPAPPLUS = {
    showToast,
    setTheme,
    repoUrl: REPO_URL
  };
})();
