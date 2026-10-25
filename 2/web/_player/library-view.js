// Presentation labels never alter source names, IDs, paths, or audio URLs.
import { digits, number } from './format.js';
export const arabicDigits = digits;
const plurals = new Intl.PluralRules('ar');
const units = {
  track: { zero:'لا مقاطع', one:'مقطع واحد', two:'مقطعان', few:'مقاطع', many:'مقطعًا', other:'مقطع' },
  folder: { zero:'لا مجلدات', one:'مجلد واحد', two:'مجلدان', few:'مجلدات', many:'مجلدًا', other:'مجلد' },
};
export function count(value, unit) {
  const category = plurals.select(value), forms = units[unit];
  return ['zero','one','two'].includes(category) ? forms[category] : `${number(value)} ${forms[category]}`;
}
export function collectionIds(folders) {
  const root = folders.get('files') || folders.get('');
  if (!root) return [];
  // A source-only grouping folder is a gateway, not an extra homepage step.
  // This is structural discovery; no speaker or collection names are hardcoded.
  return root.children.flatMap(id => {
    const child = folders.get(id);
    return child && !child.tracks.length && child.children.length ? child.children : [id];
  });
}
export function folderLabel(id, folders) {
  if (id && id === libraryRoot(folders) && /بصوت/.test(folders.get(id)?.name || '')) return 'مقاطع صوتية بصوت الشيخ الدكتور عبدالرحمن الحميّن';
  if (!id) return 'ديوان العرب';
  if (id === 'files') return 'المكتبة';
  return digits(folders.get(id)?.name || 'المجلد');
}
export function trackLabel(track) {
  return /^[\d\s()._-]+$/.test(track.title) ? `المقطع ${arabicDigits(track.title)}` : digits(track.title);
}
export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return digits('0:00');
  const s = Math.floor(seconds), tail = String(s % 60).padStart(2,'0');
  return arabicDigits(s >= 3600 ? `${Math.floor(s/3600)}:${String(Math.floor(s/60)%60).padStart(2,'0')}:${tail}` : `${Math.floor(s/60)}:${tail}`);
}
export const size = bytes => bytes >= 1_000_000 ? `${number(Math.round(bytes/100_000)/10)} م.ب` : `${number(Math.ceil(bytes/1000))} ك.ب`;

// Attribution belongs to the nearest explicitly named narrator ancestor only.
// Keep shadda in the byline and standardize the approved surname for display only.
export function narratorForTrack(track, folders) {
  let folder = track && folders.get(track.folder);
  while (folder) {
    const match = /^(?:مقاطع صوتية\s+)?بصوت\s+(.+)$/u.exec(folder.name);
    if (match) {
      const name = match[1].normalize('NFC').replace(/[\u064b-\u0650\u0652-\u065f\u0670]/gu, '').trim();
      return name.replace(/الحمين(?=$|\s)/gu, 'الحميّن');
    }
    folder = folder.parent === null ? null : folders.get(folder.parent);
  }
  return '';
}

// The narrator is a presentation root. Other branches remain reachable unchanged.
export function libraryRoot(folders) {
  const base=folders.get('files') || folders.get('');
  if(base?.children.length===1 && !base.tracks.length) {
    const narrator=folders.get(base.children[0]);
    if(/^مقاطع صوتية\s+بصوت\s/u.test(narrator?.name || ''))return narrator.id;
  }
  return base?.id ?? '';
}
