import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { collectionIds, trackLabel, count } from '../../web/_player/library-view.js';

const manifest=JSON.parse(readFileSync(new URL('../../dist/_player/library.json',import.meta.url)));
const folders=new Map(manifest.folders.map(folder=>[folder.id,folder]));
const collections=collectionIds(folders);
const folder=manifest.folders.find(f=>f.name==='المعلقات');
const folderTracks=folder.tracks.map(id=>manifest.tracks.find(t=>t.id===id));
const openTracks=async page=>{
  await page.goto(`./#folder=${encodeURIComponent(folder.id)}`);
  await expect(page.locator('.track-row')).toHaveCount(folderTracks.length);
};
const isPlaying=async page=>expect.poll(()=>page.locator('#audio').evaluate(a=>!a.paused&&a.currentTime>0&&Number.isFinite(a.duration))).toBe(true);
const setRange=async(page,id,value)=>page.locator(`#${id}`).evaluate((input,value)=>{
  input.value=String(value);input.dispatchEvent(new Event('input',{bubbles:true}));
},value);
const noLatin=async page=>{
  expect((await page.locator('body').innerText()).replaceAll('Ahmed AlGhrbi','')).not.toMatch(/[A-Za-z]/);
  const labels=await page.locator('[aria-label],[title],[alt]').evaluateAll(nodes=>nodes.filter(n=>n.getClientRects().length).flatMap(n=>['aria-label','title','alt'].map(a=>n.getAttribute(a)||'')));
  for(const label of labels) expect(label).not.toMatch(/[A-Za-z]/);
};

test('homepage exposes every actual collection directly, with exact names/counts and no tracks or eager audio',async({page})=>{
  const audioRequests=[];page.on('request',request=>{if(/\.mp3(?:\?|$)/.test(request.url()))audioRequests.push(request.url());});
  await page.goto('./');await expect(page.locator('#folders .folder-card')).toHaveCount(collections.length);
  expect(collections.length).toBeGreaterThan(0);
  expect(await page.locator('#folders .folder-card').evaluateAll(nodes=>nodes.map(n=>n.dataset.folder))).toEqual(collections);
  expect(await page.locator('.folder-card-name').allTextContents()).toEqual(collections.map(id=>folders.get(id).name));
  expect(await page.locator('.card-meta').allTextContents()).toEqual(collections.map(id=>count(folders.get(id).totalTracks,'track')));
  await expect(page.locator('#total-tracks')).toHaveText(count(manifest.stats.tracks,'track'));
  await expect(page.locator('#hero-title')).toHaveText('كلماتٌ عبرت الدهور');
  await expect(page.locator('#tracks-section')).toBeHidden();expect(audioRequests).toHaveLength(0);
  for(const id of collections){
    await page.locator('#folders .folder-card').filter({has:page.locator('.folder-card-name',{hasText:folders.get(id).name})}).first().click();
    await expect(page.locator('#folder-title')).toHaveText(folders.get(id).name);
    expect(new URLSearchParams(new URL(page.url()).hash.slice(1)).get('folder')).toBe(id);
    await expect(page.locator('.track-row')).toHaveCount(Math.min(100,folders.get(id).tracks.length));
    await page.locator('#brand').click();await expect(page.locator('#folders .folder-card')).toHaveCount(collections.length);
  }
  expect(audioRequests).toHaveLength(0);
});

test('Arabic-only interface and metadata; search is absent from UI, requests and keyboard behavior',async({page})=>{
  const requests=[];page.on('request',r=>requests.push(r.url()));
  await page.goto('./');await expect(page.locator('.folder-card')).toHaveCount(collections.length);
  await expect(page.locator('html')).toHaveAttribute('lang','ar');await expect(page.locator('html')).toHaveAttribute('dir','rtl');
  await noLatin(page);await expect(page.locator('[type=search],[id*=search],[class*=search]')).toHaveCount(0);
  await expect(page).toHaveTitle('ديوان العرب | كلماتٌ عبرت الدهور');
  await page.locator('#menu').click();await expect(page.locator('#sidebar')).toBeVisible();await noLatin(page);
  await expect(page.locator('#home')).toContainText('مقاطع صوتية بصوت الشيخ الدكتور عبدالرحمن الحميّن');await page.locator('#close-menu').click();
  await page.locator('#main').focus();await page.keyboard.press('/');await expect(page.locator('[type=search]')).toHaveCount(0);
  await page.locator('#settings-button').click();await noLatin(page);await page.getByRole('button',{name:'حسنًا',exact:true}).click();
  await openTracks(page);await noLatin(page);
  await page.locator('#expand-player').click();await noLatin(page);await page.locator('#collapse-player').click();
  const pwa=await(await page.request.get('./manifest.webmanifest')).json();
  expect(pwa.name).toBe('ديوان العرب');expect(pwa.lang).toBe('ar');expect(pwa.dir).toBe('rtl');
  expect(requests.some(url=>url.includes('search-worker'))).toBe(false);
});

test('original audio URLs play; folder navigation and refresh preserve playback and exact encoded paths',async({page})=>{
  await page.goto('./');await page.locator('.folder-card').filter({has:page.getByText('المعلقات',{exact:true})}).click();
  await page.getByRole('button',{name:`تشغيل ${trackLabel(folderTracks[0])}`,exact:true}).click();await isPlaying(page);
  const source=await page.locator('#audio').getAttribute('src');
  expect(new URL(source).pathname).toBe(`/media/${folderTracks[0].url}`);
  await page.locator('#brand').click();await expect(page.locator('.folder-card')).toHaveCount(collections.length);await isPlaying(page);
  expect(await page.locator('#audio').getAttribute('src')).toBe(source);
  await page.locator('#expand-player').click();await page.locator('#now-folder').click();await expect(page.locator('#player')).not.toHaveClass(/expanded/);await expect(page.locator('#folder-title')).toHaveText(folder.name);await isPlaying(page);
  await page.reload();await expect(page.locator('.track-row')).toHaveCount(folderTracks.length);
  expect(await page.locator('#audio').evaluate(a=>a.paused&&!a.getAttribute('src'))).toBe(true);
  await page.locator('#back').click();await expect(page.locator('#tracks-section')).toBeHidden();
});

test('real playback, seeking, previous/next, automatic progression, repeat and shuffle',async({page})=>{
  await openTracks(page);await page.locator('#play-folder').click();await isPlaying(page);
  await page.locator('#expand-player').click();
  await page.locator('#next').click();await expect(page.locator('#now-title')).toHaveText(trackLabel(folderTracks[1]));await isPlaying(page);
  await page.locator('#previous').click();await expect(page.locator('#now-title')).toHaveText(trackLabel(folderTracks[0]));await isPlaying(page);
  await page.locator('#forward').click();await expect.poll(()=>page.locator('#audio').evaluate(a=>a.currentTime)).toBeGreaterThan(9);
  await page.locator('#rewind').click();await expect.poll(()=>page.locator('#audio').evaluate(a=>a.currentTime)).toBeLessThan(5);
  await setRange(page,'progress',15);await expect.poll(()=>page.locator('#audio').evaluate(a=>a.currentTime)).toBeGreaterThanOrEqual(15);
  await page.locator('#repeat').click();await expect(page.locator('#repeat')).toHaveAttribute('aria-label','تكرار المجموعة');
  await page.locator('#repeat').click();await expect(page.locator('#repeat')).toHaveAttribute('aria-label','تكرار المقطع');
  await page.locator('#audio').evaluate(a=>{a.currentTime=a.duration-0.15;});
  await expect.poll(()=>page.locator('#audio').evaluate(a=>a.currentTime),{timeout:10000}).toBeLessThan(5);
  await expect(page.locator('#now-title')).toHaveText(trackLabel(folderTracks[0]));
  await page.locator('#repeat').click();await page.locator('#audio').evaluate(a=>{a.currentTime=a.duration-0.15;});
  await expect(page.locator('#now-title')).toHaveText(trackLabel(folderTracks[1]),{timeout:10000});
  await page.locator('#shuffle').click();await expect(page.locator('#shuffle')).toHaveAttribute('aria-pressed','true');
  await page.locator('#next').click();await expect(page.locator('#now-title')).not.toHaveText(trackLabel(folderTracks[1]));
  await page.locator('#speed').selectOption('1.5');expect(await page.locator('#audio').evaluate(a=>a.playbackRate)).toBe(1.5);
  await expect(page.locator('#volume,#mute')).toHaveCount(2);
  await page.locator('#play').click();await expect.poll(()=>page.locator('#audio').evaluate(a=>a.paused)).toBe(true);
});

test('saved positions and speed restore without autoplay',async({page})=>{
  await openTracks(page);await page.locator('#play-folder').click();await isPlaying(page);await page.locator('#expand-player').click();
  await setRange(page,'progress',21);await page.locator('#speed').selectOption('1.25');await page.locator('#play').click();
  await page.reload();await expect(page.locator('#now-title')).toHaveText(trackLabel(folderTracks[0]));
  expect(await page.locator('#audio').evaluate(a=>a.paused&&!a.getAttribute('src'))).toBe(true);
  await page.locator('#play').click();await isPlaying(page);await expect.poll(()=>page.locator('#audio').evaluate(a=>a.currentTime)).toBeGreaterThanOrEqual(20);
  expect(await page.locator('#audio').evaluate(a=>a.playbackRate)).toBe(1.25);
  await expect(page.locator('#volume,#mute')).toHaveCount(2);
});

test('iPhone two-column collections, fixed safe-area player, no overflow and WCAG accessibility',async({page})=>{
  await page.goto('./');await expect(page.locator('.folder-card')).toHaveCount(collections.length);await page.evaluate(()=>document.fonts.ready);
  for(const width of [320,375,390,430,768,1440]){
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    if(width<=430 && width>360)expect(await page.locator('#folders').evaluate(n=>getComputedStyle(n).gridTemplateColumns.split(' ').length)).toBe(2);
    const bottom=await page.locator('#player').evaluate(n=>n.getBoundingClientRect().bottom);expect(bottom).toBeCloseTo(892,0);
  }
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';window.scrollTo(0,document.documentElement.scrollHeight);});
  const rects=await page.evaluate(()=>({player:document.querySelector('#player').getBoundingClientRect().top,footer:document.querySelector('.library-footer').getBoundingClientRect().bottom}));
  expect(rects.footer).toBeLessThanOrEqual(rects.player);
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
  await openTracks(page);expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
  await page.locator('#expand-player').click();await expect(page.locator('#player')).toHaveAttribute('aria-modal','true');
  for(const width of [320,390,768]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
  await page.setViewportSize({width:390,height:844});
  await expect(page.locator('#shuffle')).toBeVisible();await expect(page.locator('#speed')).toBeVisible();await expect(page.locator('#volume,#mute')).toHaveCount(2);
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
  await page.locator('#collapse-player').click();
});

test('empty libraries and failed library requests show Arabic recovery states',async({page})=>{
  await page.route('**/_player/library.json',route=>route.fulfill({json:{version:1,stats:{tracks:0,folders:0,formats:[]},folders:[{id:'',name:'Media',parent:null,children:[],tracks:[],totalTracks:0}],tracks:[]}}));
  await page.goto('./');await expect(page.locator('#empty-title')).toHaveText('المكتبة تنتظر أولى قصائدها');await expect(page.locator('#play')).toBeDisabled();await expect(page.locator('#play-random')).toBeDisabled();await noLatin(page);
  await page.route('**/_player/library.json',route=>route.fulfill({status:500,body:'Internal error'}));
  await page.reload();await expect(page.locator('#library-status')).toHaveText('تعذّر تحميل المكتبة. تحقق من اتصالك بالإنترنت وأعد تحميل الصفحة.');await noLatin(page);await expect(page.locator('#play')).toBeDisabled();await expect(page.locator('#play-random')).toBeDisabled();
});

test('missing audio reports an Arabic error',async({page})=>{
  const m=structuredClone(manifest);m.tracks.find(t=>t.id===folderTracks[0].id).url='missing-test-track.mp3';
  await page.route('**/_player/library.json',route=>route.fulfill({json:m}));await openTracks(page);await page.locator('#play-folder').click();
  await expect(page.locator('#toast')).toBeVisible();await expect(page.locator('#playback-error')).toContainText(/تعذّر|غير متاح/);await noLatin(page);
});

test('large track lists remain paged and nested Unicode folders remain navigable',async({page})=>{
  const root='files/أسماء # + %/متفرع', trackList=Array.from({length:5000},(_,i)=>({id:`${root}/${i}.mp3`,name:`${i}.mp3`,title:String(i),folder:root,url:root.split('/').map(encodeURIComponent).join('/')+`/${i}.mp3`,format:'MP3',mime:'audio/mpeg',bytes:1000,artwork:null}));
  await page.route('**/_player/library.json',route=>route.fulfill({json:{version:1,stats:{tracks:5000,folders:3,formats:['MP3']},folders:[{id:'',name:'Media',parent:null,children:['files'],tracks:[],totalTracks:5000},{id:'files',name:'files',parent:'',children:['files/أسماء # + %'],tracks:[],totalTracks:5000},{id:'files/أسماء # + %',name:'أسماء # + %',parent:'files',children:[root],tracks:[],totalTracks:5000},{id:root,name:'متفرع',parent:'files/أسماء # + %',children:[],tracks:trackList.map(t=>t.id),totalTracks:5000}],tracks:trackList}}));
  await page.goto('./');await page.locator('.folder-card').click();await expect(page.locator('.track-row')).toHaveCount(100);
  await page.locator('#more-tracks').click();await expect(page.locator('.track-row')).toHaveCount(200);
  await page.locator('#back').click();await expect(page.locator('#folder-title')).toHaveText('أسماء # + %');await page.locator('.folder-card').click();
  await page.reload();await expect(page.locator('.track-row')).toHaveCount(100);await noLatin(page);
});

test('folder completion stops; repeat folder wraps to the original first track',async({page})=>{
  await openTracks(page);await page.getByRole('button',{name:`تشغيل ${trackLabel(folderTracks.at(-1))}`,exact:true}).click();await isPlaying(page);
  await page.locator('#audio').evaluate(a=>{a.currentTime=a.duration-0.1;});await expect(page.locator('#playback-status')).toHaveText('انتهى تشغيل مقاطع المجموعة',{timeout:10000});
  expect(await page.locator('#audio').evaluate(a=>a.paused)).toBe(true);await page.locator('#expand-player').click();await page.locator('#repeat').click();await page.locator('#play').click();await isPlaying(page);
  await page.locator('#audio').evaluate(a=>{a.currentTime=a.duration-0.1;});await expect(page.locator('#now-title')).toHaveText(trackLabel(folderTracks[0]),{timeout:10000});
});

test.describe('PWA integration',()=>{
test.use({serviceWorkers:'allow'});
test('offline Arabic shell caches no audio and remains within the project scope',async({page,context},testInfo)=>{
  test.skip(testInfo.project.name!=='chromium','Offline integration is covered once in Chromium.');
  await page.goto('./');await expect(page.locator('.folder-card')).toHaveCount(collections.length);await page.evaluate(()=>navigator.serviceWorker.ready);
  await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
  const cached=await page.evaluate(async()=>{const keys=await caches.keys();return(await Promise.all(keys.map(async key=>(await(await caches.open(key)).keys()).map(r=>r.url)))).flat();});
  expect(cached.some(url=>url.endsWith('.mp3')||url.includes('search-worker'))).toBe(false);
  await context.setOffline(true);await page.reload();await expect(page.locator('.folder-card')).toHaveCount(collections.length);await noLatin(page);await context.setOffline(false);
});
});
