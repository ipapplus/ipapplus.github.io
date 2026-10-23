/**
 * IPAPPLUS REPOSITORY — PWA & ADD TO HOME SCREEN RUNTIME
 * Preserved authentic standalone detection and installation guidance from /1.
 */

(function () {
  'use strict';
  if (window.repoPWAInitialized) return;
  window.repoPWAInitialized = true;

  const { isStandalone, standaloneDisplay } = window.RepoUI || {
    isStandalone: () => window.navigator.standalone === true,
    standaloneDisplay: null
  };

  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const safari = ios && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent);
  let installPrompt = null, installed = false, promptUsed = false;

  function update() {
    const button = document.getElementById('home-install');
    if (!button) return;
    button.hidden = (isStandalone && isStandalone()) || installed || (!safari && !installPrompt) || (!safari && promptUsed);
    if (button.hidden) {
      const help = document.getElementById('home-install-help');
      if (help) help.hidden = true;
      button.setAttribute('aria-expanded', 'false');
    }
  }

  window.addEventListener('beforeinstallprompt', event => {
    if (ios || promptUsed || installed) return;
    event.preventDefault();
    installPrompt = event;
    update();
  });

  window.addEventListener('appinstalled', () => {
    installed = true;
    installPrompt = null;
    update();
  });

  if (standaloneDisplay) {
    if (standaloneDisplay.addEventListener) standaloneDisplay.addEventListener('change', update);
    else if (standaloneDisplay.addListener) standaloneDisplay.addListener(update);
  }

  window.addEventListener('pageshow', update);
  document.addEventListener('repoviewchange', update);

  document.addEventListener('click', async event => {
    const button = event.target.closest('#home-install');
    if (!button || button.hidden || (isStandalone && isStandalone())) return;
    if (safari) {
      const help = document.getElementById('home-install-help');
      if (help) {
        help.textContent = 'In Safari, tap Share → Add to Home Screen.';
        help.hidden = !help.hidden;
        button.setAttribute('aria-expanded', String(!help.hidden));
      }
      return;
    }
    if (!installPrompt || promptUsed) return;
    const prompt = installPrompt;
    installPrompt = null;
    promptUsed = true;
    update();
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === 'accepted') installed = true;
    } catch (error) {
      // Installation failure must not affect the site
    }
    update();
  });

  update();

  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register(new URL('sw.js', document.baseURI), { updateViaCache: 'none' })
      .catch(() => {});
  }
})();
