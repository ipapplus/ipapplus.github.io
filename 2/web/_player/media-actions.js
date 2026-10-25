import { canDownloadAudio } from './environment.js';

import { number } from './format.js';
export const downloadSize = bytes => `${number(bytes / 1_000_000, 2)} م.ب`;
export function publicAudioURL(track, publicBase) {
  // The canonical project URL also gives local previews genuine public links.
  // Manifest paths are already encoded segment by segment; never encode them again.
  const url = new URL(track.url, publicBase);
  if (url.protocol !== 'https:') throw new Error('A public HTTPS audio URL is required');
  return url.href;
}

export { toast } from './notifications.js';
import { toast } from './notifications.js';

export async function copyText(value) {
  if (navigator.clipboard && window.isSecureContext) {
    try { await navigator.clipboard.writeText(value); return; } catch { /* Try selection below. */ }
  }
  const previous = document.activeElement;
  const area = document.createElement('textarea');
  area.value = value; area.setAttribute('readonly', '');
  area.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px';
  document.body.appendChild(area);
  try {
    area.focus({preventScroll:true}); area.select(); area.setSelectionRange(0, value.length);
    if (!document.execCommand('copy')) throw new Error('Copy failed');
  } finally {
    area.remove(); if (previous?.isConnected) previous.focus({preventScroll:true});
  }
}
const pendingDownloads = new Set();
async function downloadFromWorker(track, link) {
  if (pendingDownloads.has(link.href)) return;
  const url = link.href;
  pendingDownloads.add(url); link.setAttribute('aria-busy', 'true');
  try {
    // WebKit can stall native downloads of worker-supplied responses:
    // https://bugs.webkit.org/show_bug.cgi?id=247793
    // Only this case needs a Blob. The existing worker reuses verified cached
    // audio or its in-flight download; this does not create another audio store.
    const response = await fetch(url);
    if (response.status !== 200 || response.headers.has('Content-Range')) throw new Error('Incomplete download');
    const blob = await response.blob();
    if (blob.size !== track.bytes) throw new Error('Incomplete download');
    const local = URL.createObjectURL(blob), anchor = document.createElement('a');
    anchor.href = local; anchor.download = track.name; anchor.target = '_blank'; anchor.rel = 'noopener noreferrer';
    anchor.hidden = true; document.body.appendChild(anchor);
    try { anchor.click(); } finally {
      anchor.remove();
      // Safari may consume the URL after click() returns. Release it later.
      setTimeout(() => URL.revokeObjectURL(local), 60_000);
    }
    toast('إن فُتح المقطع، احفظه في «الملفات» من قائمة المشاركة.');
  } catch {
    toast('تعذّر تنزيل المقطع. تحقق من اتصالك بالإنترنت وأعد المحاولة.');
  } finally {
    pendingDownloads.delete(url); link.removeAttribute('aria-busy');
  }
}
export function createTrackActions(track, {base, publicBase, icon}) {
  const tools = document.createElement('div'); tools.className = 'track-tools';
  const copy = document.createElement('button'); copy.type = 'button'; copy.className = 'track-action copy-link';
  copy.innerHTML = icon('link'); copy.append(document.createTextNode('نسخ الرابط'));
  copy.onclick = async event => {
    event.stopPropagation();
    try { await copyText(publicAudioURL(track, publicBase)); toast('نُسخ رابط المقطع'); }
    catch { toast('تعذّر نسخ الرابط'); }
  };
  const download = document.createElement('a'); download.className = 'track-action download-audio';
  download.href = new URL(track.url, base).href; download.download = track.name;
  download.target = '_blank'; download.rel = 'noopener noreferrer';
  download.hidden = !canDownloadAudio(); download.dataset.audioDownload = '';
  download.innerHTML = icon('download');
  const label = document.createElement('span'); label.textContent = 'تنزيل';
  const size = document.createElement('span'); size.className = 'download-size'; size.textContent = downloadSize(track.bytes);
  download.append(label, size);
  download.onclick = event => {
    event.stopPropagation();
    // Recheck at the gesture as well as lifecycle events; never turn a hidden action into navigation.
    if (!canDownloadAudio()) { event.preventDefault(); return; }
    if (navigator.serviceWorker?.controller) {
      event.preventDefault(); downloadFromWorker(track, download); return;
    }
    // The browser owns this download. Opening media is not proof it was saved.
    toast('إن فُتح المقطع، احفظه في «الملفات» من قائمة المشاركة.');
  };
  tools.append(copy, download);
  return tools;
}
export function refreshDownloadActions() {
  const hidden = !canDownloadAudio();
  document.querySelectorAll('[data-audio-download]').forEach(link => { link.hidden = hidden; });
}
