import { OfflineLibrary, setupOfflineManagement } from './offline.js';
import { setupInstallation } from './install.js';
import { canDownloadAudio, watchDisplayMode } from './environment.js';
import { createTrackActions, refreshDownloadActions, toast } from './media-actions.js';
import { FolderQueue } from './queue.js';
import { arabicDigits, count, collectionIds, folderLabel, trackLabel, formatTime, size, narratorForTrack, libraryRoot } from './library-view.js';

import { setNumerals, digits, speedLabel } from './format.js';
import { setupControlHints } from './control-hints.js';
import { createVolumeController } from './volume.js';
import { icon } from './icons.js';
import { configureNotifications, dismissToast, refreshToastNumerals } from './notifications.js';

const $ = id => document.getElementById(id);
const BASE = new URL('../', import.meta.url);
const absolute = path => new URL(path, BASE).href;
const PUBLIC_BASE = document.querySelector('link[rel=canonical]').href;
const offline = new OfflineLibrary(BASE);
function setIcon(element, name) {
  // Native volume readback can redraw during a press; retain its pointer target.
  if (element.childElementCount === 1 && element.firstElementChild?.dataset.uiIcon === name) {
    element.firstElementChild.querySelectorAll('text').forEach(text=>{text.textContent=digits(text.textContent);});
    return;
  }
  element.innerHTML = icon(name);
}
document.querySelectorAll('[data-icon]').forEach(el => setIcon(el, el.dataset.icon));
window.DiwanTheme.renderIcon=icon;
window.DiwanTheme.apply();
$('theme-toggle').onclick=()=>window.DiwanTheme.toggle();
$('theme-preference').onchange=event=>window.DiwanTheme.set(event.target.value);
setupInstallation();
setupOfflineManagement(offline,{count,size,trackLabel});
function el(tag, className, text) {
  const node = document.createElement(tag); if (className) node.className = className;
  if (text !== undefined) node.textContent = text; return node;
}
const STORAGE = `media-player:${BASE.pathname}:v1`;
let prefs;
try { prefs = JSON.parse(localStorage.getItem(STORAGE) || '{}'); } catch { prefs = {}; }
if (!prefs || typeof prefs !== 'object' || Array.isArray(prefs)) prefs = {};
if (!prefs.positions || typeof prefs.positions !== 'object' || Array.isArray(prefs.positions)) prefs.positions = {};
if (!prefs.durations || typeof prefs.durations !== 'object' || Array.isArray(prefs.durations)) prefs.durations = {};
setNumerals(prefs.numerals);
function save() { try { localStorage.setItem(STORAGE, JSON.stringify(prefs)); } catch { /* Storage may be unavailable in private browsing. */ } }
const optional = ['actionToasts','controlHints','seekButtons','shuffleControl','repeatControl'];
const enabled = key => prefs[key] !== false;
configureNotifications(()=>enabled('actionToasts'));
function actionToast(message) { toast(message,{optional:true}); }
function applyFont() {
  const system=prefs.font==='system';
  document.documentElement.dataset.font=system?'system':'heritage';
  $('font-preference').value=system?'system':'heritage';
  $('font-toggle').setAttribute('aria-pressed',String(system));
  $('font-toggle').setAttribute('aria-label',system?'استخدام خط الديوان':'استخدام خط الجهاز');
  $('font-toggle').title=system?'استخدام خط الديوان':'استخدام خط الجهاز';
}
function setFont(value) {prefs.font=value==='system'?'system':'heritage';save();applyFont();toast(prefs.font==='system'?'خط الجهاز مفعّل':'خط الديوان مفعّل',{scope:'site'});}
$('font-toggle').onclick=()=>setFont(prefs.font==='system'?'heritage':'system');
$('font-preference').onchange=event=>setFont(event.target.value);
applyFont();
function applyOptional() {
  for(const key of optional) $(key).checked=enabled(key);
  for(const [key,ids] of [['seekButtons',['rewind','forward']],['shuffleControl',['shuffle']],['repeatControl',['repeat']]])
    for(const id of ids) $(id).hidden=!enabled(key);
}
for(const key of optional) $(key).onchange=()=>{prefs[key]=$(key).checked;save();applyOptional();window.dispatchEvent(new Event('diwan-hints-change'));if(key==='actionToasts'&&!enabled(key)&&$('toast').dataset.optional==='true')dismissToast();};
applyOptional();
setupControlHints({enabled:()=>enabled('controlHints'),feedback:()=>enabled('actionToasts')});
window.addEventListener('diwan-control-hint',event=>toast(event.detail,{optional:true}));
window.addEventListener('diwan-theme-change',event=>toast(({auto:'المظهر يتبع الجهاز',light:'المظهر الفاتح مفعّل',dark:'المظهر الداكن مفعّل'})[event.detail],{scope:'site'}));
$('numeral-preference').value=prefs.numerals==='western'?'western':'eastern';
function refreshNumerals() {
  refreshToastNumerals();
  document.querySelectorAll('.step-number').forEach((node,index)=>node.textContent=digits(index+1));
  for(const option of $('speed').options) option.textContent=speedLabel(Number(option.value));
  for(const id of ['rewind','forward']) {
    setIcon($(id),id);$(id).setAttribute('aria-label',`${id==='rewind'?'الرجوع':'التقديم'} ${digits(10)} ثوانٍ`);
  }
  if(manifest) {
    $('tree').querySelectorAll('[data-folder]').forEach(node=>node.textContent=folderPath(node.dataset.folder));
    $('total-tracks').textContent=count(manifest.stats.tracks,'track');
    $('home-folder-count').textContent=count(homeCollections.length,'folder');
    const limits=[folderLimit,trackLimit];openFolder(currentFolder);
    [folderLimit,trackLimit]=limits;renderLists();
    if(current)updateNowPlaying();
  }
  updateProgress();updatePreferences();
}
$('numeral-preference').onchange=event=>{
  prefs.numerals=event.target.value;setNumerals(prefs.numerals);save();refreshNumerals();
  window.dispatchEvent(new Event('diwan-numerals-change'));
  toast(prefs.numerals==='western'?'الأرقام الغربية مفعّلة':'الأرقام العربية الشرقية مفعّلة',{scope:'site'});
};
const folderQueue = new FolderQueue();
folderQueue.shuffle = prefs.shuffle === true;
folderQueue.repeat = ['off', 'track', 'folder'].includes(prefs.repeat) ? prefs.repeat : 'off';
// Library playback keeps its modes independent of the current folder's preferences.
const globalQueue = new FolderQueue();
globalQueue.shuffle = prefs.globalShuffle !== false;
globalQueue.repeat = ['off', 'track', 'folder'].includes(prefs.globalRepeat) ? prefs.globalRepeat : 'off';
let queue = folderQueue;
// Retired website volume settings must not silently mute returning listeners.
delete prefs.volume; delete prefs.muted;
let audio = $('audio');
const audioListeners = [];
function listenAudio(name, handler) { audioListeners.push([name,handler]); audio.addEventListener(name,handler); }
const volume = createVolumeController(audio, {
  // Pending seeks and readiness retries belong to the application listener.
  restorePosition:false,
  saved:prefs.audioLevel,
  onChange:controller=>{
    prefs.audioLevel=controller.preference;save();drawVolume(controller);
  },
  onReplace:(next,previous)=>{
    pendingPosition=seekTarget ?? (pendingPosition || previous.currentTime || 0);seekTarget=null;
    for(const [name,handler] of audioListeners)previous.removeEventListener(name,handler);
    audio=next;for(const [name,handler] of audioListeners)audio.addEventListener(name,handler);
  },
  onFallback:()=>actionToast('يمكنك متابعة الاستماع والتحكم في الصوت من الجهاز.'),
  onPlaybackError:()=>playbackError('اختر «تشغيل» لمتابعة الاستماع.'),
});
function drawVolume(controller=volume) {
  const value=controller.sliderValue;
  const text=value===0?'صامت':Math.abs(value-1)<0.01?'عادي':value<1?'منخفض':'مرتفع';
  for(const id of ['volume']) {
    const slider=$(id);slider.max=controller.sliderMaximum;slider.value=value;
    slider.disabled=controller.mode==='fallback'&&!controller.nativeAdjustable;
    slider.setAttribute('aria-valuetext',text);slider.style.setProperty('--fill',`${value/controller.sliderMaximum*100}%`);
  }
  for(const id of ['mute']) {
    const button=$(id),muted=controller.effectiveLevel===0;
    button.setAttribute('aria-pressed',String(muted));button.setAttribute('aria-label',muted?'تشغيل الصوت':'كتم الصوت');setIcon(button,muted?'silent':'speaker');
  }
}
for(const id of ['volume']) {
  $(id).addEventListener('pointerdown',event=>{if(event.pointerType!=='touch'&&navigator.userActivation?.isActive!==false)volume.prepare();});
  // WebKit touch activation is available at release, not reliably on pointerdown.
  for(const event of ['pointerup','touchend','keydown']) $(id).addEventListener(event,()=>volume.prepare({userGesture:true}));
  // Input can repeat for a long touch before activation is available. Apply
  // to an existing graph immediately; initialize a new graph only on release.
  $(id).addEventListener('input',()=>volume.setLevel(Number($(id).value)));
  $(id).addEventListener('change',()=>{volume.prepare({userGesture:true});actionToast('تغيّر مستوى الصوت');});
}
for(const id of ['mute']) $(id).onclick=()=>{
  volume.toggleMute();volume.prepare({userGesture:true});actionToast(volume.effectiveLevel===0?'الصوت مكتوم':'الصوت مفعّل');
};
drawVolume();
function prepareVolume() {
  // Ordinary untouched playback stays native. Saved changes initialize during a play gesture.
  if(volume.mode==='processed'||((volume.level!==1||volume.muted)&&navigator.userActivation?.isActive!==false))volume.prepare();
}
window.addEventListener('pageshow',()=>volume.recover());
document.addEventListener('visibilitychange',()=>{if(!document.hidden)volume.recover();});
const rates = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
audio.playbackRate = rates.includes(Number(prefs.speed)) ? Number(prefs.speed) : 1;
$('speed').value = audio.playbackRate;
$('resume').checked = prefs.resume !== false;
let libraryState = 'loading', completionMessage = '';
let manifest, folders, tracks, currentFolder = '', rootFolder = '', current = null, loadedId = null, generation = 0;
let folderRows = [], trackRows = [], folderLimit = 60, trackLimit = 100;
let savedAt = 0, pendingPosition = 0, homeCollections = [], searchQuery = '';
let episodeOrder = prefs.episodeOrder === 'oldest' ? 'oldest' : 'newest';
let currentEpisode = '';
// WebKit can report the old position until seeked fires. Retain the user's
// target for UI and persistence, and retry restoration once data is ready.
let seekTarget = null;
let liveRows = new Map();
const folderPath = id => folderLabel(id, folders);
const folderHash = (id, episode = '') => `#folder=${encodeURIComponent(id ?? '')}${episode ? `&episode=${encodeURIComponent(episode)}` : ''}`;
function orderedTracks(items) {
  const rows = items.map(item => typeof item === 'string' ? tracks.get(item) : item).filter(Boolean);
  return episodeOrder === 'oldest' ? rows : [...rows].reverse();
}
function folderTrackIds(folderId) {
  return orderedTracks(folders.get(folderId)?.tracks || []).map(track => track.id);
}
function knownSeconds(track) {
  const listed = Number(track?.seconds);
  if (listed > 0) return listed;
  const saved = Number(prefs.durations?.[track?.id]);
  return saved > 0 ? saved : 0;
}
function episodeMeta(track) {
  const seconds = knownSeconds(track);
  const time = seconds > 0 ? formatTime(seconds) : '';
  const detail = canDownloadAudio() ? 'حلقة' : `حلقة · ${size(track.bytes)}`;
  return [folderPath(track.folder), detail, time].filter(Boolean).join(' · ');
}
function rememberDuration(track, seconds) {
  const rounded = Math.round(Number(seconds));
  if (!track || !(rounded > 0) || Number(track.seconds) > 0) return;
  track.seconds = rounded;
  prefs.durations[track.id] = rounded;
  save();
}
function image(container, url, fallback) {
  container.replaceChildren();
  if (!url) { setIcon(container, fallback); return; }
  const img = el('img'); img.src = absolute(url); img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
  img.addEventListener('error', () => setIcon(container, fallback), { once: true }); container.append(img);
}

const desktopNav = () => matchMedia('(min-width:1100px)').matches;
function closeMenu() {
  const hadFocus = $('sidebar').contains(document.activeElement);
  $('sidebar-overlay').hidden = true; $('menu').setAttribute('aria-expanded', 'false');
  if (desktopNav()) {
    $('sidebar').classList.add('open');
    $('sidebar').inert = $('player').classList.contains('expanded');
    document.querySelector('.workspace').inert = $('player').classList.contains('expanded');
    $('player').inert = false;
    return;
  }
  $('sidebar').classList.remove('open'); $('sidebar').inert = true;
  document.querySelector('.workspace').inert = $('player').classList.contains('expanded'); $('player').inert = false;
  if (hadFocus) $('menu').focus();
}
function syncNavigation() {
  if (!desktopNav()) return;
  $('sidebar').classList.add('open');
  $('sidebar-overlay').hidden = true;
  $('menu').setAttribute('aria-expanded', 'false');
  const locked = $('player').classList.contains('expanded');
  $('sidebar').inert = locked;
  document.querySelector('.workspace').inert = locked;
}
syncNavigation();
matchMedia('(min-width:1100px)').addEventListener('change', syncNavigation);
function navigate(id, {reveal = false, episode = ''} = {}) {
  id=normalizeFolder(id);
  searchQuery = '';
  if ($('library-search')) $('library-search').value = '';
  currentEpisode = episode;
  const next = folderHash(id, episode);
  if (location.hash !== next) location.hash = next;
  openFolder(id);
  closeMenu();
  if (reveal) {
    window.scrollTo({top:0,behavior:'instant'});
    const focusTarget = currentEpisode ? $('episode-title') : $('folder-title');
    focusTarget.setAttribute('tabindex','-1'); focusTarget.focus({preventScroll:true});
  }
}
function updateTree(id) {
  $('home').setAttribute('aria-current',id===rootFolder?'page':'false');
  $('tree').querySelectorAll('[data-folder]').forEach(node=>{
    if(node.dataset.folder===id)node.setAttribute('aria-current','page');else node.removeAttribute('aria-current');
  });
}
function normalizeFolder(id) {
  if(!folders.has(id))return rootFolder;
  // Legacy links to physical ancestors resolve to the logical root.
  let ancestor=folders.get(rootFolder);
  while(ancestor && ancestor.id!==id)ancestor=folders.get(ancestor.parent);
  return ancestor ? rootFolder : id;
}
function breadcrumbs(id) {
  const list=[]; let folder=folders.get(id);
  while(folder) { list.push(folder); if(folder.id===rootFolder)break; folder=folder.parent===null ? null : folders.get(folder.parent); }
  $('breadcrumbs').replaceChildren();
  list.reverse().forEach((folder,index)=>{
    if(index) $('breadcrumbs').append(el('span','separator','/'));
    const link=el('a','',folderPath(folder.id)); link.href=folderHash(folder.id); link.dir='auto';
    if(folder.id===id) link.setAttribute('aria-current','page');
    link.onclick=event=>{event.preventDefault();navigate(folder.id);}; $('breadcrumbs').append(link);
  });
}
function openFolder(id) {
  id=normalizeFolder(id);
  currentFolder=id; prefs.folder=id; save();
  const folder=folders.get(id), home=id===rootFolder;
  $('hero').hidden=!home; $('folder-heading').hidden=home; $('navigation').hidden=home;
  breadcrumbs(id); updateTree(id); $('back').disabled=home;
  $('folder-title').textContent=folderPath(id);
  $('folder-summary').textContent=`${count(folder.tracks.length,'track')} في هذا المجلد${folder.children.length ? `، و${count(folder.children.length,'folder')}` : ''}`;
  image($('folder-emblem'),folder.artwork || '_player/heritage-desert.webp','folder');
  $('folders-label').textContent=home ? 'البرامج' : 'برامج هذا الباب';
  $('play-folder').disabled=!folder.tracks.length;
  $('library-status').textContent='';
  const requested = new URLSearchParams(location.hash.slice(1)).get('episode') || '';
  const episodeTrack = tracks.get(requested);
  currentEpisode = episodeTrack && normalizeFolder(episodeTrack.folder) === id ? requested : '';
  folderRows=(home ? homeCollections : folder.children).map(child=>folders.get(child));
  trackRows=orderedTracks(folder.tracks);
  folderLimit=60; trackLimit=100;
  if (searchQuery) { renderSearch(); return; }
  renderLists();
  renderEpisode();
  $('empty-title').textContent=home ? 'المكتبة تنتظر أولى قصائدها' : 'لا مقاطع في هذا المجلد بعد';
  $('empty-copy').textContent='ستظهر المقاطع هنا حين تُضاف إلى المكتبة.';
  document.title=currentEpisode ? `${trackLabel(tracks.get(currentEpisode))}، ${folderPath(id)}` : home ? 'ديوان العرب | كلماتٌ عبرت الدهور' : `${folderPath(id)}، ديوان العرب`;
}
function folderCard(folder) {
  const button=el('button','folder-card show-card'); button.type='button'; button.dataset.folder=folder.id;
  button.setAttribute('aria-label',`${folderPath(folder.id)}، ${count(folder.totalTracks,'track')}`);
  const art=el('span','show-art'); image(art, folder.artwork || '_player/heritage-desert.webp', 'folder');
  const name=el('span','folder-card-name',folderPath(folder.id)); name.dir='auto';
  const meta=el('span','card-meta',count(folder.totalTracks,'track'));
  button.append(art,name,meta); button.onclick=()=>navigate(folder.id); return button;
}
function trackRow(track,index) {
  const row=el('div','track-row episode-row'); row.dataset.track=track.id;
  const art=el('span','episode-art'); image(art, track.artwork || folders.get(track.folder)?.artwork || '_player/heritage-desert.webp', 'note');
  const number=el('span','track-number',arabicDigits(String(index+1).padStart(2,'0'))); number.setAttribute('aria-hidden','true');
  const button=el('button','track-play'); button.type='button'; button.setAttribute('aria-label',`تفاصيل ${trackLabel(track)}`);
  const name=el('span','track-name',trackLabel(track)); name.dir='auto';
  const metadata=el('span','track-path',episodeMeta(track));
  button.append(name,metadata);
  button.onclick=event=>{event.stopPropagation(); openEpisode(track.id);};
  const action=el('button','row-action'); action.type='button'; action.setAttribute('aria-label',`تشغيل ${trackLabel(track)}`);
  const glyph=el('span','row-action-icon'); setIcon(glyph,'play');
  const length=el('span','episode-length'); length.hidden=true;
  action.append(glyph,length);
  action.onclick=event=>{
    event.stopPropagation();
    if(current?.id===track.id) { if(queue === globalQueue) useFolderQueue(track); togglePlayback(); }
    else selectTrack(track.id);
  };
  const cacheIndicator=el('span','cache-indicator');cacheIndicator.id=`cache-status-${index}`;cacheIndicator.hidden=true;button.setAttribute('aria-describedby',cacheIndicator.id);button.append(cacheIndicator);
  const saveButton=el('button','icon-button save-track');saveButton.type='button';setIcon(saveButton,'cache');
  saveButton.onclick=()=>offline.save(track);
  const progress=el('span','episode-progress'); progress.hidden=true;
  row.append(art,number,button,action,saveButton,progress,createTrackActions(track,{base:BASE,publicBase:PUBLIC_BASE,icon}));
  row.onclick=event=>{if(!event.target.closest('button,a')) openEpisode(track.id);};
  liveRows.set(track.id,{row,button,number,index,action,glyph,length,cacheIndicator,saveButton,metadata,progress}); return row;
}
function renderEpisode() {
  const track = currentEpisode ? tracks.get(currentEpisode) : null;
  const show = !!(track && !searchQuery && normalizeFolder(track.folder) === currentFolder);
  $('episode').hidden = !show;
  if (!show) return;
  $('episode-show').textContent = folderPath(track.folder);
  $('episode-title').textContent = trackLabel(track);
  $('episode-meta').textContent = episodeMeta(track);
  image($('episode-art'), track.artwork || folders.get(track.folder)?.artwork || '_player/heritage-desert.webp', 'note');
  updateEpisodeButton();
}
function updateEpisodeButton() {
  const track = currentEpisode && tracks?.get(currentEpisode);
  if (!track || $('episode').hidden) return;
  const playing = current?.id === track.id && !audio.paused;
  setIcon($('episode-play-icon'), playing ? 'pause' : 'play');
  $('episode-play-label').textContent = playing ? 'إيقاف مؤقت' : 'تشغيل الحلقة';
  $('episode-play').setAttribute('aria-label', `${$('episode-play-label').textContent}: ${trackLabel(track)}`);
}
function openEpisode(id) {
  const track = tracks.get(id);
  if (!track) return;
  const folder = normalizeFolder(track.folder);
  if (folder !== currentFolder || searchQuery) { navigate(folder, {episode: id, reveal: true}); return; }
  currentEpisode = id;
  const next = folderHash(folder, id);
  if (location.hash !== next) location.hash = next;
  renderEpisode();
  document.title = `${trackLabel(track)}، ${folderPath(folder)}`;
  $('episode').scrollIntoView({block:'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
}
function paintProgress(id) {
  const entry = liveRows.get(id);
  const track = tracks?.get(id);
  if (!entry || !track) return;
  const seconds = knownSeconds(track) || (current?.id === id && Number.isFinite(audio.duration) ? audio.duration : 0);
  const position = current?.id === id
    ? (seekTarget ?? (pendingPosition || (loadedId ? audio.currentTime : Number(prefs.positions[id]) || 0)))
    : Number(prefs.positions[id]) || 0;
  const ratio = seconds > 0 ? Math.max(0, Math.min(1, position / seconds)) : 0;
  entry.progress.hidden = ratio <= 0.004;
  entry.progress.style.setProperty('--progress', `${ratio * 100}%`);
  const shown = seconds > 0 ? (current?.id === id && position > 1 ? Math.max(0, seconds - position) : seconds) : 0;
  entry.length.textContent = shown > 0 ? formatTime(shown) : '';
  entry.length.hidden = !(shown > 0);
}
function renderSearch() {
  const q = searchQuery.toLocaleLowerCase('ar');
  const match = value => String(value || '').toLocaleLowerCase('ar').includes(q);
  $('hero').hidden = true;
  $('folder-heading').hidden = false;
  $('navigation').hidden = true;
  $('folder-title').textContent = 'نتائج البحث';
  $('folder-summary').textContent = `«${searchQuery}»`;
  image($('folder-emblem'), '_player/heritage-desert.webp', 'library');
  $('play-folder').disabled = true;
  $('episode').hidden = true;
  folderRows = [...folders.values()].filter(folder => folder.id && folder.id !== rootFolder && match(folderPath(folder.id)));
  trackRows = orderedTracks([...tracks.values()].filter(track => match(trackLabel(track)) || match(folderPath(track.folder)) || match(track.title)));
  $('folders-label').textContent = 'البرامج';
  $('empty-title').textContent = 'لا نتائج مطابقة';
  $('empty-copy').textContent = 'جرّب كلمة من اسم الحلقة أو البرنامج.';
  renderLists();
  document.title = 'بحث، ديوان العرب';
}
function renderLists() {
  $('folders-section').hidden=!folderRows.length; $('tracks-section').hidden=!trackRows.length;
  $('folder-count').textContent=count(folderRows.length,'folder'); $('track-count').textContent=count(trackRows.length,'track');
  $('folders').replaceChildren(...folderRows.slice(0,folderLimit).map(folderCard)); liveRows=new Map();
  $('tracks').replaceChildren(...trackRows.slice(0,trackLimit).map(trackRow));
  $('more-folders').hidden=folderRows.length<=folderLimit; $('more-tracks').hidden=trackRows.length<=trackLimit;
  $('empty').hidden=!!(folderRows.length || trackRows.length); updateActiveRows(); updateCacheRows();
}
function updateActiveRows() {
  for(const [id,{row,number,index,action,glyph}] of liveRows) {
    const active=current?.id===id, playing=active && !audio.paused;
    row.classList.toggle('is-current',active);
    action.setAttribute('aria-label',`${playing ? 'إيقاف مؤقت' : 'تشغيل'} ${trackLabel(tracks.get(id))}`);
    if(active) {row.setAttribute('aria-current','true');setIcon(number,playing ? 'wave' : 'play');}
    else {row.removeAttribute('aria-current');number.textContent=arabicDigits(String(index+1).padStart(2,'0'));}
    setIcon(glyph,playing ? 'pause' : 'play');
    paintProgress(id);
  }
  updateEpisodeButton();
}
function cacheLabel(state) {
  return ({saving:'جارٍ الحفظ…',saved:'محفوظ دون إنترنت',failed:'تعذّر الحفظ'})[state] || '';
}
function updateCacheRows() {
  for(const [id,{cacheIndicator,saveButton}] of liveRows) {
    const cache=offline.state(tracks.get(id)),state=cache?.state;
    cacheIndicator.title=cache?.code==='quota'?'مساحة التخزين غير كافية. وفّر مساحة تخزين إضافية ثم أعد الحفظ.':'';
    cacheIndicator.textContent=cacheLabel(state);cacheIndicator.hidden=!state;cacheIndicator.dataset.state=state||'';
    saveButton.disabled=state==='saved'||state==='saving';
    saveButton.setAttribute('aria-label',state==='saved'?'المقطع محفوظ دون إنترنت':state==='saving'?'جارٍ حفظ المقطع':'حفظ المقطع للاستماع دون إنترنت');
    setIcon(saveButton,state==='saved'?'saved':'cache');
  }
  const state=current&&offline.state(current)?.state;
  $('now-cache').textContent=cacheLabel(state);$('now-cache').hidden=!state;$('now-cache').dataset.state=state||'';
}
watchDisplayMode(() => {
  refreshDownloadActions();
  for(const [id,{metadata}] of liveRows) metadata.textContent=episodeMeta(tracks.get(id));
});
offline.addEventListener('change',updateCacheRows);
window.addEventListener('online',()=>offline.refresh().catch(()=>{}));
window.addEventListener('pageshow',()=>offline.refresh().catch(()=>{}));
$('more-folders').onclick=()=>{folderLimit+=60;renderLists();};
$('more-tracks').onclick=()=>{trackLimit+=100;renderLists();};
$('back').onclick=()=>{if(currentFolder!==rootFolder)navigate(folders.get(currentFolder).parent ?? rootFolder);};
$('home').onclick=$('header-home').onclick=()=>navigate('');
$('brand').onclick=event=>{event.preventDefault();navigate('');};
function browseCollections(event) {
  event?.preventDefault(); navigate('');
  requestAnimationFrame(()=>$('collections').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'}));
}
$('header-collections').onclick=$('browse-collections').onclick=browseCollections;
$('menu').onclick=()=>{
  const open=!$('sidebar').classList.contains('open');
  if(!open) {closeMenu();return;}
  $('sidebar').inert=false; $('sidebar').classList.add('open'); $('sidebar-overlay').hidden=false;
  $('menu').setAttribute('aria-expanded','true'); document.querySelector('.workspace').inert=true; $('player').inert=true; $('close-menu').focus();
};
$('close-menu').onclick=$('sidebar-overlay').onclick=closeMenu;
$('library-search').addEventListener('input', () => {
  searchQuery = $('library-search').value.trim();
  if (!manifest) return;
  if (!searchQuery) openFolder(currentFolder);
  else renderSearch();
});
function applySortLabel() {
  const newest = episodeOrder === 'newest';
  $('episode-sort').textContent = newest ? 'من الأحدث إلى الأقدم' : 'من الأقدم إلى الأحدث';
  $('episode-sort').setAttribute('aria-pressed', String(newest));
  $('episode-order-label').textContent = newest ? 'الأحدث أولًا' : 'الأقدم أولًا';
  const label = $('play-folder-label');
  if (label) label.textContent = newest ? 'أحدث حلقة' : 'أول حلقة';
}
applySortLabel();
$('episode-sort').onclick = () => {
  episodeOrder = episodeOrder === 'oldest' ? 'newest' : 'oldest';
  prefs.episodeOrder = episodeOrder;
  save();
  applySortLabel();
  if (!manifest) return;
  if (queue === folderQueue && current) folderQueue.set(folderTrackIds(current.folder), current.id);
  openFolder(currentFolder);
};
$('episode-play').onclick = () => {
  const track = tracks?.get(currentEpisode);
  if (!track) return;
  if (current?.id === track.id) { if (queue === globalQueue) useFolderQueue(track); togglePlayback(); }
  else selectTrack(track.id);
};
window.addEventListener('hashchange',()=>{
  if (!manifest) return;
  const params = new URLSearchParams(location.hash.slice(1));
  const id = normalizeFolder(params.get('folder') ?? '');
  if (currentFolder !== id) {
    searchQuery = '';
    $('library-search').value = '';
    openFolder(id);
    return;
  }
  const episode = params.get('episode') || '';
  const track = tracks.get(episode);
  currentEpisode = track && normalizeFolder(track.folder) === currentFolder ? episode : '';
  renderEpisode();
  if (currentEpisode) document.title = `${trackLabel(track)}، ${folderPath(currentFolder)}`;
});
if('ResizeObserver' in window) new ResizeObserver(()=>{
  if(!$('player').classList.contains('expanded')) document.documentElement.style.setProperty('--player-height',`${Math.ceil($('player').getBoundingClientRect().height)}px`);
}).observe($('player'));
if('ResizeObserver' in window)new ResizeObserver(entries=>{document.documentElement.style.setProperty('--header-height',`${Math.ceil(entries[0].target.getBoundingClientRect().height)}px`);}).observe(document.querySelector('.topbar'));

function playbackError(message) { if(message)toast(message,{important:true}); $('playback-error').textContent = message; $('playback-error').hidden = !message; }
function status(message) { $('playback-status').textContent = message; }
function updateNowPlaying() {
  if (!current) return;
  $('player-track-actions').replaceChildren(createTrackActions(current,{base:BASE,publicBase:PUBLIC_BASE,icon}));
  $('player-track-actions').hidden=false;
  $('now-title').textContent = trackLabel(current);
  const narrator = narratorForTrack(current, folders);
  $('now-narrator').textContent = narrator ? `بصوت ${narrator}` : '';
  $('now-narrator').hidden = !narrator;
  $('now-folder').textContent = folderPath(current.folder); $('now-folder').disabled = false;
  image($('cover'), current.artwork || '_player/heritage-desert.webp', 'book');
  for (const id of ['play','previous','next','rewind','forward']) $(id).disabled = false;
  updateActiveRows(); updateCacheRows();
  if ('mediaSession' in navigator && 'MediaMetadata' in window) {
    navigator.mediaSession.metadata = new MediaMetadata({ title: trackLabel(current), artist: narrator, album: folderPath(current.folder),
      artwork: current.artwork ? [{ src: absolute(current.artwork) }] : [{ src: absolute('_player/icon-512.png'), sizes:'512x512', type:'image/png' }] });
  }
}
function persistPosition(force = false) {
  if (!current || (!force && Date.now() - savedAt < 4000)) return;
  const position = seekTarget ?? (pendingPosition || (Number.isFinite(audio.currentTime) && loadedId === current.id ? audio.currentTime : 0));
  savedAt = Date.now();
  prefs.positions[current.id] = Math.round(position * 10) / 10;
  prefs.last = { id: current.id, mode: queue === globalQueue ? 'global' : 'folder', position };
  save();
}
function useFolderQueue(track) {
  queue = folderQueue;
  queue.set(folderTrackIds(track.folder), track.id);
  updatePreferences();
}
function selectTrack(id) {
  const track = tracks.get(id); if (!track) return;
  useFolderQueue(track);
  playTrack(id);
}
function startGlobalPlayback() {
  const ids = tracks ? [...tracks.keys()] : [];
  if (libraryState !== 'ready' || !ids.length) {
    status(libraryState === 'loading' ? 'جارٍ تحميل المكتبة…' : libraryState === 'error' ? 'تعذّر تحميل المكتبة. أعد تحميل الصفحة.' : 'لا مقاطع متاحة للتشغيل بعد.');
    return;
  }
  const id = ids[Math.floor(Math.random() * ids.length)];
  queue = globalQueue;
  queue.shuffle = true;
  prefs.globalShuffle = true;
  queue.set(ids, id);
  updatePreferences();
  // No asynchronous work before play(): preserve the Safari user gesture.
  playTrack(id);
}
$('play-random').onclick = startGlobalPlayback;
async function playTrack(id, position = 0) {
  const token = ++generation; current = tracks.get(id); if (!current) return;
  pendingPosition = Math.max(0, Number(position) || 0);
  seekTarget = null;
  completionMessage = '';
  updateNowPlaying(); playbackError(''); status('جارٍ تحميل المقطع…');
  if(!navigator.onLine && offline.loaded && offline.state(current)?.state!=='saved') {
    audio.pause();loadedId=null;audio.removeAttribute('src');audio.load();updateProgress();
    status('');playbackError('هذا المقطع غير محفوظ دون إنترنت. اتصل بالإنترنت لحفظه والاستماع إليه.');return;
  }
  offline.save(current);
  if (!audio.canPlayType(current.mime)) playbackError('قد لا يدعم متصفحك هذا النوع من الصوت. جرّب متصفحًا آخر إذا تعذّر التشغيل.');
  loadedId = id; audio.src = absolute(current.url); audio.playbackRate = Number($('speed').value);
  prepareVolume();
  try { await audio.play(); if (token === generation) persistPosition(true); }
  catch (error) {
    if (token !== generation || error.name === 'AbortError') return;
    status('');
    playbackError(!navigator.onLine ? 'هذا المقطع غير محفوظ دون إنترنت، أو لم يكتمل حفظه. اتصل بالإنترنت وأعد المحاولة.' : error.name === 'NotAllowedError' ? 'اختر «تشغيل» لبدء الاستماع.' : 'تعذّر تشغيل المقطع. أعد المحاولة أو اختر مقطعًا آخر.');
  }
}
async function togglePlayback() {
  if (!current) { startGlobalPlayback(); return; }
  if (!audio.paused) { audio.pause(); return; }
  if (loadedId !== current.id || audio.error) { playTrack(current.id, pendingPosition); return; }
  prepareVolume();
  try { await audio.play(); playbackError(''); } catch { playbackError('تعذّر بدء التشغيل. أعد المحاولة أو جرّب متصفحًا آخر.'); }
}
function moveNext(ended = false) {
  const next = queue.next(ended);
  if (next) playTrack(next); else { audio.pause(); status(completionMessage = queue === globalQueue ? 'انتهى تشغيل مقاطع المكتبة' : 'انتهى تشغيل مقاطع المجموعة'); persistPosition(true); }
}
function seekTo(position) {
  if (!Number.isFinite(audio.duration)) return;
  seekTarget = Math.max(0, Math.min(audio.duration, position));
  pendingPosition = 0;
  audio.currentTime = seekTarget;
  updateProgress();
}
function retrySeek() {
  if (seekTarget !== null && !audio.seeking && audio.readyState >= 2 && Math.abs(audio.currentTime - seekTarget) > 0.75) audio.currentTime = seekTarget;
}
function seek(delta) { seekTo((seekTarget ?? audio.currentTime) + delta); }
$('play').onclick = togglePlayback;
document.querySelector('.mini-progress').addEventListener('click', event => {
  event.stopPropagation();
  if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
  const rect = event.currentTarget.getBoundingClientRect();
  const ratio = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0;
  seekTo(Math.min(1, Math.max(0, ratio)) * audio.duration);
});
$('play-folder').onclick = () => { const id = folderTrackIds(currentFolder)[0]; if (id) selectTrack(id); };
$('next').onclick = () => moveNext();
$('previous').onclick = () => { const id = queue.previous(); if (id) playTrack(id); };
$('rewind').onclick = () => {seek(-10);actionToast(`رجوع ${digits(10)} ثوانٍ`);}; $('forward').onclick = () => {seek(10);actionToast(`تقديم ${digits(10)} ثوانٍ`);};
$('now-folder').onclick = () => {
  if (!current) return;
  expandPlayer(false);
  navigate(current.folder,{reveal:true});
};
function updatePreferences() {
  $('shuffle').classList.toggle('active', queue.shuffle); $('shuffle').setAttribute('aria-pressed', String(queue.shuffle));
  $('shuffle').disabled = false;
  $('shuffle').setAttribute('aria-label','التشغيل العشوائي');
  $('repeat').classList.toggle('active', queue.repeat !== 'off'); $('repeat').setAttribute('aria-pressed', String(queue.repeat !== 'off'));
  $('repeat').setAttribute('aria-label', ({off:'التكرار متوقف',folder:queue === globalQueue ? 'تكرار المكتبة' : 'تكرار المجموعة',track:'تكرار المقطع'})[queue.repeat]); $('repeat').title = 'تبديل وضع التكرار';
  setIcon($('repeat'), queue.repeat === 'track' ? 'repeatOne' : 'repeat');
}
$('shuffle').onclick = () => { queue.setShuffle(!queue.shuffle); prefs[queue === globalQueue ? 'globalShuffle' : 'shuffle'] = queue.shuffle; save(); updatePreferences(); actionToast(queue.shuffle?'التشغيل العشوائي مفعّل':'التشغيل العشوائي متوقف'); };
$('repeat').onclick = () => { queue.repeat = { off:'folder', folder:'track', track:'off' }[queue.repeat]; prefs[queue === globalQueue ? 'globalRepeat' : 'repeat'] = queue.repeat; save(); updatePreferences(); actionToast($('repeat').getAttribute('aria-label')); };
$('speed').onchange = () => { audio.playbackRate = Number($('speed').value); prefs.speed = audio.playbackRate; save(); actionToast(`سرعة التشغيل: ${speedLabel(audio.playbackRate)}`); };
$('progress').oninput = () => {
  seekTo(Number($('progress').value));
};
function updateProgress() {
  const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
  const position = seekTarget ?? (pendingPosition || (loadedId ? audio.currentTime : 0));
  $('position').textContent = formatTime(position); $('duration').textContent = `−${formatTime(Math.max(0,duration-position))}`;
  document.querySelector('.mini-progress').style.setProperty('--fill',`${duration ? position/duration*100 : 0}%`);
  $('progress').disabled = duration <= 0; $('progress').max = String(duration || 100); $('progress').value = position;
  $('progress').setAttribute('aria-valuetext', `${formatTime(position)} من ${formatTime(duration)}`);
  $('progress').style.setProperty('--fill', `${duration ? position/duration*100 : 0}%`);
  if (duration && 'mediaSession' in navigator && navigator.mediaSession.setPositionState) {
    try { navigator.mediaSession.setPositionState({ duration, playbackRate:audio.playbackRate, position:Math.max(0,Math.min(position,duration)) }); } catch { /* Some streams have no seekable position. */ }
  }
  if (current && duration > 1 && !(Number(current.seconds) > 0)) {
    rememberDuration(current, duration);
    const entry = liveRows.get(current.id);
    if (entry) entry.metadata.textContent = episodeMeta(current);
    if (currentEpisode === current.id && !$('episode').hidden) $('episode-meta').textContent = episodeMeta(current);
  }
  if (current) paintProgress(current.id);
}
function restorePosition() {
  // WebKit may expose a transient zero duration before its real durationchange.
  // Retain the saved target until a positive duration is available.
  if (pendingPosition && Number.isFinite(audio.duration) && audio.duration > 0) {
    seekTo(Math.min(pendingPosition, Math.max(0, audio.duration - 1)));
  }
}
listenAudio('loadedmetadata', () => { restorePosition(); updateProgress(); });
for (const name of ['loadeddata','canplay','playing']) listenAudio(name, () => {restorePosition();retrySeek();updateProgress();});
listenAudio('seeked', () => {
  if (seekTarget !== null && Math.abs(audio.currentTime-seekTarget) < 0.75) seekTarget = null;
  updateProgress(); persistPosition(true);
});
listenAudio('durationchange', () => { restorePosition(); updateProgress(); });
listenAudio('timeupdate', () => { restorePosition(); updateProgress(); persistPosition(); });
listenAudio('ratechange', updateProgress);
listenAudio('waiting', () => status('جارٍ تجهيز الصوت…'));
listenAudio('stalled', () => { if (!audio.paused) status('في انتظار الاتصال…'); });
for (const name of ['play','pause','playing']) listenAudio(name, () => {
  setIcon($('play'), audio.paused ? 'play' : 'pause'); $('play').setAttribute('aria-label', audio.paused ? 'تشغيل' : 'إيقاف مؤقت');
  if (!audio.paused) completionMessage = '';
  if (name !== 'play') status(audio.paused ? completionMessage : '');
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = audio.paused ? 'paused' : 'playing';
  updateActiveRows(); if (name === 'pause') persistPosition(true);
});
listenAudio('ended', () => moveNext(true));
listenAudio('error', () => {
  status(''); const messages = { 1:'توقف تحميل المقطع. أعد المحاولة.', 2:'انقطع الاتصال. تحقق من اتصالك بالإنترنت وأعد التشغيل.',
    3:'تعذّرت قراءة المقطع. جرّب متصفحًا آخر أو اختر مقطعًا آخر.',
    4:'المقطع غير متاح أو لا يدعمه المتصفح. جرّب مقطعًا آخر.' };
  playbackError(!navigator.onLine ? 'هذا المقطع غير محفوظ دون إنترنت، أو لم يكتمل حفظه. اتصل بالإنترنت وأعد المحاولة.' : messages[audio.error?.code] || 'تعذّر تشغيل الصوت. أعد المحاولة.');
});
if ('mediaSession' in navigator) {
  const actions = { play:togglePlayback, pause:() => audio.pause(), previoustrack:() => $('previous').click(), nexttrack:() => moveNext(),
    seekbackward:e => seek(-(e.seekOffset || 10)), seekforward:e => seek(e.seekOffset || 10),
    seekto:e => seekTo(e.seekTime),
    stop:() => { audio.pause(); if (loadedId) seekTo(0); } };
  // Play is idempotent for headset/lock-screen integrations.
  actions.play = () => { if (audio.paused) togglePlayback(); };
  for (const [action, handler] of Object.entries(actions)) try { navigator.mediaSession.setActionHandler(action,handler); } catch { /* Optional action unsupported. */ }
}
let pageScroll;
function expandPlayer(expand) {
  if ($('player').classList.contains('expanded') === expand) return;
  resetSheetDrag();
  if (expand) {
    pageScroll = {x:scrollX,y:scrollY};
    // Fixed-body locking also prevents rubber-band background scrolling on iOS.
    document.body.style.top = `${-pageScroll.y}px`;
    document.body.style.left = `${-pageScroll.x}px`;
    document.body.classList.add('player-open');
  } else {
    document.body.classList.remove('player-open');
    document.body.style.removeProperty('top'); document.body.style.removeProperty('left');
    if (pageScroll) window.scrollTo({left:pageScroll.x,top:pageScroll.y,behavior:'instant'});
  }
  $('player').classList.toggle('expanded', expand);
  document.querySelector('.player-content').scrollTop=0;
  $('expand-player').setAttribute('aria-expanded',String(expand));
  $('sidebar').inert = expand; document.querySelector('.workspace').inert = expand;
  $('player').setAttribute('aria-label', expand ? 'مشغّل الصوت الموسّع' : 'مشغّل الصوت');
  if (expand) { $('player').setAttribute('role','dialog'); $('player').setAttribute('aria-modal','true'); $('collapse-player').focus({preventScroll:true}); }
  else { $('player').removeAttribute('role'); $('player').removeAttribute('aria-modal'); $('expand-player').focus({preventScroll:true}); }
}
$('expand-player').onclick = () => expandPlayer(true); $('collapse-player').onclick = () => expandPlayer(false);
let ignoreMiniClickUntil = 0;
$('player').addEventListener('click', event => {
  if (!$('player').classList.contains('expanded') && performance.now() >= ignoreMiniClickUntil && !event.target.closest('button,a,input,select')) expandPlayer(true);
});
// Pointer events retain native range/button interactions; only the sheet's free surface drags.
let sheetDrag;
const resetSheetDrag = () => {
  sheetDrag = null; $('player').classList.remove('dragging'); $('player').style.removeProperty('--sheet-drag');
};
$('player').addEventListener('pointerdown', event => {
  if (sheetDrag) { resetSheetDrag(); return; }
  if (!$('player').classList.contains('expanded') || !event.isPrimary || !['touch','pen'].includes(event.pointerType) || event.target.closest('button,a,input,select,label')) return;
  sheetDrag = {id:event.pointerId,x:event.clientX,y:event.clientY,time:performance.now(),distance:0};
  // Synthetic events in tests do not own a native pointer capture.
  if (event.isTrusted) $('player').setPointerCapture(event.pointerId);
});
$('player').addEventListener('pointermove', event => {
  if (!sheetDrag || event.pointerId !== sheetDrag.id) return;
  const dx=event.clientX-sheetDrag.x,dy=event.clientY-sheetDrag.y;
  if (Math.abs(dx)>16 && Math.abs(dx)>Math.abs(dy)) { resetSheetDrag(); return; }
  sheetDrag.distance=Math.max(0,dy);
  if (dy>8 || $('player').classList.contains('dragging')) {
    event.preventDefault(); $('player').classList.add('dragging');
    $('player').style.setProperty('--sheet-drag',`${Math.max(0,dy)}px`);
  }
});
$('player').addEventListener('pointerup', event => {
  if (!sheetDrag || event.pointerId !== sheetDrag.id) return;
  const {distance,time}=sheetDrag;
  const minimize=distance>=Math.min(120,Math.max(60,innerHeight*.15)) || (distance>40 && distance/Math.max(1,performance.now()-time)>.5);
  if (distance>8) { event.preventDefault(); ignoreMiniClickUntil=performance.now()+350; }
  resetSheetDrag(); if (minimize) expandPlayer(false);
});
$('player').addEventListener('pointercancel', resetSheetDrag);
$('player').addEventListener('lostpointercapture', resetSheetDrag);
// visualViewport is the fallback for browser chrome changes on older iOS releases.
function sizePlayerViewport(event) {
  if (CSS.supports('height','100dvh')) document.documentElement.style.removeProperty('--player-viewport-height');
  else {
    // WebKit may dispatch window.resize before visualViewport has its new dimensions.
    const height=event?.target === window ? innerHeight : (window.visualViewport?.height || innerHeight);
    document.documentElement.style.setProperty('--player-viewport-height',`${height}px`);
  }
  resetSheetDrag();
}
window.visualViewport?.addEventListener('resize',sizePlayerViewport);
window.addEventListener('resize',sizePlayerViewport); sizePlayerViewport();
$('settings-button').onclick = () => $('settings').showModal();
$('info-button').onclick = () => $('about').showModal();
$('settings').addEventListener('close', () => $('settings-button').focus());
$('about').addEventListener('close', () => $('info-button').focus());
$('resume').onchange = () => { prefs.resume = $('resume').checked; save(); };
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if ($('player').classList.contains('expanded')) expandPlayer(false); closeMenu(); }
  const modal = [...document.querySelectorAll('dialog[open]')].at(-1) || ( $('player').classList.contains('expanded') ? $('player') : $('sidebar').classList.contains('open') ? $('sidebar') : null);
  if (modal && e.key === 'Tab') {
    const focusable = [...modal.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select,summary')].filter(n => n.getClientRects().length);
    const first = focusable[0], last = focusable.at(-1);
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
  }
  if (document.querySelector('dialog[open]') || e.target.closest('#install-guide') || e.altKey || e.ctrlKey || e.metaKey || /INPUT|SELECT|TEXTAREA|BUTTON|SUMMARY|A/.test(e.target.tagName)) return;
  if (e.code === 'Space') { e.preventDefault(); togglePlayback(); }
  if (e.key === 'ArrowLeft') { e.preventDefault(); seek(-10); }
  if (e.key === 'ArrowRight') { e.preventDefault(); seek(10); }
});
window.addEventListener('pagehide', () => persistPosition(true));
document.addEventListener('visibilitychange', () => { if (document.hidden) persistPosition(true); });
updatePreferences();
refreshNumerals();

async function init() {
  try {
    const response=await fetch(absolute('_player/library.json'),{cache:'no-cache'});
    if(!response.ok) throw new Error('Library request failed');
    manifest=await response.json(); if(manifest.version!==1) throw new Error('Unsupported library version');
    folders=new Map(manifest.folders.map(folder=>[folder.id,folder])); tracks=new Map(manifest.tracks.map(track=>[track.id,track]));
    for (const track of tracks.values()) if (!(Number(track.seconds) > 0) && Number(prefs.durations[track.id]) > 0) track.seconds = Number(prefs.durations[track.id]);
    rootFolder=libraryRoot(folders);
    homeCollections=collectionIds(folders);
    libraryState = 'ready';
    $('play').disabled = $('play-random').disabled = !tracks.size;
    if (!tracks.size) status('لا مقاطع متاحة للتشغيل بعد.');
    $('total-tracks').textContent=count(manifest.stats.tracks,'track');
    $('home-folder-count').textContent=count(homeCollections.length,'folder');
    for(const id of homeCollections) {
      const button=el('button','sidebar-folder',folderPath(id));button.dataset.folder=id;button.onclick=()=>navigate(id);$('tree').append(button);
    }
    // The root URL always opens the collections, including for existing users.
    // Exact folder hashes still restore navigation; playback preferences survive.
    openFolder(new URLSearchParams(location.hash.slice(1)).get('folder') ?? '');
    if(prefs.resume!==false && tracks.has(prefs.last?.id)) {
      current=tracks.get(prefs.last.id); pendingPosition=Math.max(0,Number(prefs.last.position)||0);
      queue = prefs.last.mode === 'global' ? globalQueue : folderQueue;
      queue.set(queue === globalQueue ? [...tracks.keys()] : folderTrackIds(current.folder), current.id);
      updatePreferences(); updateNowPlaying(); updateProgress();
      status('موضع الاستماع محفوظ؛ اختر «تشغيل» للمتابعة');
    }
  } catch {
    libraryState = 'error';
    $('play').disabled = $('play-random').disabled = true;
    $('library-status').textContent='تعذّر تحميل المكتبة. تحقق من اتصالك بالإنترنت وأعد تحميل الصفحة.';
    $('back').disabled=true; $('home').disabled=true;
  }
}
init();
