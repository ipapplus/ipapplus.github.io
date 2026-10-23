(function() {
  'use strict';
  if (window.repoPWAInitialized) return;
  window.repoPWAInitialized = true;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = isIOS && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent);

  let installPrompt = null;
  let isInstalled = false;
  let promptFired = false;

  function updatePWAUI() {
    const btn = document.getElementById('home-install');
    const help = document.getElementById('home-install-help');
    if (!btn) return;

    const standalone = window.RepoUI ? window.RepoUI.isStandalone() : (window.navigator.standalone === true);
    btn.hidden = standalone || isInstalled || (!isSafari && !installPrompt) || (!isSafari && promptFired);

    if (btn.hidden) {
      if (help) help.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
    }
  }

  window.addEventListener('beforeinstallprompt', event => {
    if (isIOS || promptFired || isInstalled) return;
    event.preventDefault();
    installPrompt = event;
    updatePWAUI();
  });

  window.addEventListener('appinstalled', () => {
    isInstalled = true;
    installPrompt = null;
    updatePWAUI();
  });

  document.addEventListener('repoviewchange', updatePWAUI);
  document.addEventListener('repolangchange', updatePWAUI);
  window.addEventListener('pageshow', updatePWAUI);

  document.addEventListener('click', async event => {
    const btn = event.target.closest('#home-install');
    if (!btn || btn.hidden) return;

    if (isSafari) {
      const help = document.getElementById('home-install-help');
      if (help) {
        help.textContent = window.RepoUI ? window.RepoUI.t('safariInstallHelp') : 'In Safari, tap Share and select “Add to Home Screen”.';
        help.hidden = !help.hidden;
        btn.setAttribute('aria-expanded', String(!help.hidden));
      }
      return;
    }

    if (!installPrompt || promptFired) return;
    const prompt = installPrompt;
    installPrompt = null;
    promptFired = true;
    updatePWAUI();

    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        isInstalled = true;
      }
    } catch (e) {}
    updatePWAUI();
  });

  updatePWAUI();

  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register(new URL('sw.js', document.baseURI), { updateViaCache: 'none' })
      .catch(() => {});
  }
})();
