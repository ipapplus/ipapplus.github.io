// Shared by installation guidance and recording actions; UA alone cannot detect a PWA.
export const standaloneDisplay = typeof matchMedia === 'function' ? matchMedia('(display-mode: standalone)') : null;
export function isStandalone(nav = globalThis.navigator, display = standaloneDisplay) {
  return nav?.standalone === true || display?.matches === true;
}
export function canDownloadAudio(nav = globalThis.navigator, display = standaloneDisplay) {
  const ua = nav?.userAgent || '';
  return !isStandalone(nav, display) && /Apple/i.test(nav?.vendor || '') &&
    /AppleWebKit\//.test(ua) && /Version\/[\d.]+.*Safari\//.test(ua) &&
    !/CriOS|FxiOS|Edg(?:e|A|iOS)?\/|Chrome|Chromium|OPR\/|OPiOS|SamsungBrowser|Android|DuckDuckGo|GSA\/|YaBrowser/i.test(ua);
}
export function watchDisplayMode(update) {
  if (standaloneDisplay?.addEventListener) standaloneDisplay.addEventListener('change', update);
  else standaloneDisplay?.addListener(update);
  for (const event of ['pageshow', 'focus', 'appinstalled']) window.addEventListener(event, update);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) update(); });
}
