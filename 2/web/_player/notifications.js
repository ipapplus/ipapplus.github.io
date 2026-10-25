import { digits } from './format.js';
let feedbackEnabled = () => true;
let timer;
let exitTimer;
export function configureNotifications(enabled) { feedbackEnabled = enabled; }
export function dismissToast() {
  const element = document.getElementById('toast');
  clearTimeout(timer);
  clearTimeout(exitTimer);
  element.classList.remove('show');
  // Leave the top-layer element alive for its exit animation. A new toast cancels this.
  exitTimer = setTimeout(() => {
    element.textContent = '';
    if (element.hidePopover && element.matches(':popover-open')) element.hidePopover();
  }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180);
}
export function toast(message, { optional = false, important = false } = {}) {
  if (optional && !feedbackEnabled()) return;
  const element = document.getElementById('toast');
  clearTimeout(timer);
  clearTimeout(exitTimer);
  element.dataset.optional=String(optional);
  element.setAttribute('role',important ? 'alert' : 'status');
  element.setAttribute('aria-live',important ? 'assertive' : 'polite');
  element.textContent = digits(message);
  // The top layer escapes transformed parents and also stays above native dialogs.
  if (element.showPopover && !element.matches(':popover-open')) element.showPopover();
  if (!element.classList.contains('show')) element.getBoundingClientRect();
  element.classList.add('show');
  timer = setTimeout(dismissToast, important ? 5000 : 2400);
}
export function refreshToastNumerals() {
  const element = document.getElementById('toast');
  if (element.textContent) element.textContent = digits(element.textContent);
}
