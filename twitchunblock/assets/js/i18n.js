// Shared product localization. Dictionaries contain only English and Arabic.
import en from './locales/en.js'
import ar from './locales/ar.js'
export const translations = { en, ar }
export const LANGUAGE_KEY = 'twitchunblock.language'
export const LANGS = [{ id: 'en', label: 'English' }, { id: 'ar', label: 'العربية' }]
let current = 'en'
const valid = value => value === 'en' || value === 'ar'
export function savedLanguage() { try { const v=localStorage.getItem(LANGUAGE_KEY); return valid(v) ? v : null } catch { return null } }
export const lang = () => current
export const locale = () => current === 'ar' ? 'ar-u-nu-latn' : 'en'
export function deviceLang() {
  return /^ar(?:-|$)/i.test(navigator.languages?.[0] || navigator.language || '') ? 'ar' : 'en'
}
export function initLang(saved) {
  let preference
  try { preference = localStorage.getItem(LANGUAGE_KEY) } catch {}
  // Retain a previous explicit supported choice; retired languages use device detection.
  if (!valid(preference) && valid(saved)) {
    preference = saved
    try { localStorage.setItem(LANGUAGE_KEY, saved) } catch {}
  }
  return setLang(valid(preference) ? preference : deviceLang(), false)
}
export function setLang(value, persist = true) {
  if (!valid(value)) return current
  current = value
  document.documentElement.lang = value
  document.documentElement.dir = value === 'ar' ? 'rtl' : 'ltr'
  if (persist) try { localStorage.setItem(LANGUAGE_KEY, value) } catch {}
  return value
}
const nouns = {
  broadcast: ['لا توجد بثوث مسجلة', 'بث مسجل واحد', 'بثان مسجلان', 'بثوث مسجلة', 'بثًا مسجلًا', 'بث مسجل'],
  viewer: ['لا يوجد مشاهدون', 'مشاهد واحد', 'مشاهدان', 'مشاهدين', 'مشاهدًا', 'مشاهد'],
  view: ['لا توجد مشاهدات', 'مشاهدة واحدة', 'مشاهدتان', 'مشاهدات', 'مشاهدة', 'مشاهدة'],
  message: ['لا توجد رسائل جديدة', 'رسالة جديدة واحدة', 'رسالتان جديدتان', 'رسائل جديدة', 'رسالة جديدة', 'رسالة جديدة'],
  video: ['لا توجد فيديوهات', 'فيديو واحد', 'فيديوهان', 'فيديوهات', 'فيديو', 'فيديو'],
  hidden: ['لا يوجد مستخدمون مخفيون', 'مستخدم مخفي واحد', 'مستخدمان مخفيان', 'مستخدمين مخفيين', 'مستخدمًا مخفيًا', 'مستخدم مخفي'],
  minute: ['0 دقيقة', 'دقيقة', 'دقيقتان', 'دقائق', 'دقيقة', 'دقيقة'],
  hour: ['0 ساعة', 'ساعة', 'ساعتان', 'ساعات', 'ساعة', 'ساعة'],
  second: ['0 ثانية', 'ثانية', 'ثانيتان', 'ثوانٍ', 'ثانية', 'ثانية'],
  channel: ['لا توجد قنوات', 'قناة واحدة', 'قناتان', 'قنوات', 'قناة', 'قناة'],
  vote: ['لا توجد أصوات', 'صوت واحد', 'صوتان', 'أصوات', 'صوتًا', 'صوت'],
}
const categories = ['zero', 'one', 'two', 'few', 'many', 'other']
export function countText(n, noun) {
  const number = Math.max(0, Number(n) || 0)
  if (current === 'en') return `${number} ${noun}${number === 1 ? '' : 's'}`
  const category = new Intl.PluralRules('ar').select(number)
  const word = nouns[noun]?.[categories.indexOf(category)] || noun
  return ['zero', 'one', 'two'].includes(category) ? word : `${number} ${word}`
}
export function relativeTime(value, unit = 'minute') {
  if (!value) return t('just_now')
  return new Intl.RelativeTimeFormat(locale(), { numeric: 'always' }).format(-Math.abs(value), unit).replace(/ (واحدة|واحد)$/, '')
}
export function t(key, params = {}) {
  const n = Number(params.n)
  if (Number.isFinite(n)) {
    if (['minutes_ago', 'hours_ago', 'days_ago'].includes(key)) return relativeTime(n, {minutes_ago:'minute',hours_ago:'hour',days_ago:'day'}[key])
    const noun = {viewers_count:'viewer',views_count:'view',chat_new:'message',videos_count:'video',hidden_users:'hidden',prediction_votes:'vote',duration_minutes:'minute',seconds:'second',raid_viewers:'viewer'}[key]
    if (noun) { if (current === 'en' && key === 'chat_new') return `${n} new message${n===1?'':'s'}`; if (current === 'en' && key === 'hidden_users') return `${n} hidden user${n===1?'':'s'}`; return countText(n, noun) }
    if (current === 'ar' && key === 'filter_count') return `${countText(n,'broadcast')} يتضمن «\u2068${params.k}\u2069»`
    if (current === 'ar' && key === 'raid_incoming') return `ينضم \u2068${params.u}\u2069 مع ${countText(n,'viewer').replace('مشاهدان','مشاهدين')}`
    if (current === 'ar' && key === 'pin_left') return `متبقي ${countText(n, 'minute')}`
    if (current === 'ar' && key === 'raid_in') return `الانتقال خلال ${countText(n, 'second').replace('ثانيتان', 'ثانيتين')}`
    if (current === 'ar' && key === 'import_done') return `اكتمل الاستيراد. ${countText(n, 'channel')}`
  }
  let text = translations[current][key] ?? en[key] ?? key
  for (const [k, v] of Object.entries(params)) text = text.replaceAll(`{${k}}`, () => ['u','t','k','l'].includes(k) ? `\u2068${v}\u2069` : String(v))
  // Isolate fixed Latin product names and keyboard symbols in localized prose.
  return text.replace(/\b(?:Twitch|GitHub|iPhone|OAuth|Space|VOD|MXFia19|ipapplus|[KFMTC])\b|←\/→|↑\/↓/g, token => `\u2066${token}\u2069`)
}
export function applyStatic(root = document) {
  for (const el of root.querySelectorAll('[data-i18n-content]')) el.setAttribute('content', t(el.dataset.i18nContent))
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n)
  for (const el of root.querySelectorAll('[data-i18n-ph]')) { el.placeholder = t(el.dataset.i18nPh); el.setAttribute('aria-label', t(el.dataset.i18nPh)) }
  for (const el of root.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', t(el.dataset.i18nAria))
  for (const el of root.querySelectorAll('[data-i18n-title]')) { el.title = t(el.dataset.i18nTitle); el.setAttribute('aria-label', el.title) }
  for (const el of root.querySelectorAll('[data-viewers]')) el.setAttribute('aria-label', t('viewers_count', {n:Number(el.dataset.viewers)}))
  for (const el of root.querySelectorAll('[data-language-select]')) el.value = current
  for (const el of root.querySelectorAll('[data-l]')) { el.classList.toggle('active', el.dataset.l === current); el.setAttribute('aria-pressed', String(el.dataset.l === current)) }
}
