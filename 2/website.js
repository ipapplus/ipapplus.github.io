/**
 * IPAPPLUS ARCHIVE — Core Script
 * Editorial Software Archive Controller
 */

(() => {
  'use strict';

  const STORAGE_KEY_THEME = 'archive-theme';
  const REPO_URL = 'https://ipapplus.github.io';

  // 1. Theme Engine (System / Dark / Light)
  const themeButtons = document.querySelectorAll('[data-theme-choice]');
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');

  function getSystemPreference() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(choice) {
    const effectiveTheme = choice === 'system' ? getSystemPreference() : choice;
    document.documentElement.dataset.theme = effectiveTheme;

    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', effectiveTheme === 'dark' ? '#141210' : '#f6f4ee');
    }

    themeButtons.forEach(btn => {
      const isSelected = btn.getAttribute('data-theme-choice') === choice;
      btn.classList.toggle('is-active', isSelected);
      btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    });
  }

  function setTheme(choice) {
    try {
      localStorage.setItem(STORAGE_KEY_THEME, choice);
    } catch (e) {
      // Storage unavailable
    }
    applyTheme(choice);
  }

  let savedTheme = 'system';
  try {
    savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || 'system';
  } catch (e) {}

  applyTheme(savedTheme);

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      let current = 'system';
      try {
        current = localStorage.getItem(STORAGE_KEY_THEME) || 'system';
      } catch (e) {}
      if (current === 'system') {
        applyTheme('system');
      }
    });
  }

  themeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const choice = btn.getAttribute('data-theme-choice');
      if (choice) setTheme(choice);
    });
  });

  // 2. Toast Notification Controller
  let toastTimeout = null;
  const toastElement = document.getElementById('archive-toast');

  function showToast(message) {
    if (!toastElement) return;
    toastElement.textContent = message;
    toastElement.classList.add('is-visible');

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toastElement.classList.remove('is-visible');
    }, 2400);
  }

  // 3. Clipboard Action
  const copyRepoButtons = document.querySelectorAll('[data-action="copy-repo"]');
  copyRepoButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      let copied = false;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(REPO_URL);
          copied = true;
        }
      } catch (err) {}

      if (!copied) {
        try {
          const textarea = document.createElement('textarea');
          textarea.value = REPO_URL;
          textarea.setAttribute('readonly', '');
          textarea.style.position = 'fixed';
          textarea.style.left = '-9999px';
          document.body.appendChild(textarea);
          textarea.select();
          copied = document.execCommand('copy');
          document.body.removeChild(textarea);
        } catch (e) {}
      }

      if (copied) {
        showToast('Repository endpoint copied to clipboard.');
      } else {
        showToast('Repository endpoint: ' + REPO_URL);
      }
    });
  });

  // 4. Touch Tactile Feedback
  const interactiveSelector = '.btn-primary, .btn-secondary, .nav-action-link, .filter-pill, .theme-button';
  document.addEventListener('pointerdown', (e) => {
    const target = e.target.closest(interactiveSelector);
    if (target) target.classList.add('is-pressed');
  }, { passive: true });

  const clearPressed = (e) => {
    const target = e.target.closest(interactiveSelector);
    if (target) target.classList.remove('is-pressed');
  };
  document.addEventListener('pointerup', clearPressed, { passive: true });
  document.addEventListener('pointercancel', clearPressed, { passive: true });

  // Expose global helpers
  window.ArchiveApp = {
    showToast,
    setTheme,
    repoUrl: REPO_URL
  };
})();
