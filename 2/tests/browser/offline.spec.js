import {test,expect,chromium} from '@playwright/test';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';import os from 'node:os';
import AxeBuilder from '@axe-core/playwright';
import {trackLabel,size,collectionIds} from '../../web/_player/library-view.js';
const manifest=JSON.parse(await readFile(new URL('../../dist/_player/library.json',import.meta.url)));
const ordered=[...manifest.tracks].sort((a,b)=>a.bytes-b.bytes),track=ordered[0],second=ordered.find(t=>t.folder===track.folder&&t.id!==track.id);
const collections=collectionIds(new Map(manifest.folders.map(folder=>[folder.id,folder])));
const audioName='diwan-audio:/media/:v1';
const row=(page,t)=>page.locator(`[data-track=${JSON.stringify(t.id)}]`);
const playing=async page=>expect.poll(()=>page.locator('#audio').evaluate(a=>!a.paused&&a.currentTime>0&&a.duration>0)).toBe(true);
async function ready(page,t=track){
  await page.goto(`./#folder=${encodeURIComponent(t.folder)}`);await expect(row(page,t)).toBeVisible();
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
  await page.reload();await expect(row(page,t)).toBeVisible();
}
async function saved(page,t=track){await expect(row(page,t).locator('.cache-indicator')).toHaveText('محفوظ دون إنترنت',{timeout:20000});}
async function manager(page){await page.locator('#settings-button').click();await page.locator('#cache-settings').click();await expect(page.locator('#offline-shell-status')).toContainText('جاهزة');}
const entries=page=>page.evaluate(async name=>(await(await caches.open(name)).keys()).length,audioName);
test.use({serviceWorkers:'allow'});

test('playing saves complete audio; offline reload, byte ranges, seeking, repeat and folder browsing work',async({page,context})=>{
  await ready(page);expect(await entries(page)).toBe(0);
  await row(page,track).locator('.track-play').click();await playing(page);await saved(page);
  expect(await entries(page)).toBe(1);await page.locator('#play').click();
  await context.setOffline(true);await page.reload();await expect(row(page,track)).toBeVisible();await saved(page);
  expect(await page.locator('#audio').evaluate(a=>!a.getAttribute('src')&&a.paused)).toBe(true);
  await page.locator('#play').click();await playing(page);
  const original=new Uint8Array(await readFile(new URL(`../../dist/${track.id}`,import.meta.url)));
  for(const [range,start,end,status] of [[null,0,track.bytes-1,200],['bytes=0-1',0,1,206],['bytes=-7',track.bytes-7,track.bytes-1,206],['bytes=7-',7,track.bytes-1,206],['bytes=999999999-',0,-1,416]]){
    const result=await page.evaluate(async({url,range})=>{const r=await fetch(new URL(url,location.href.split('#')[0]),{headers:range?{Range:range}:{}});return {status:r.status,length:r.headers.get('Content-Length'),type:r.headers.get('Content-Type'),contentRange:r.headers.get('Content-Range'),bytes:Array.from(new Uint8Array(await r.arrayBuffer()))};},{url:`/media/${track.url}`,range});
    expect(result.status).toBe(status);expect(Number(result.length)).toBe(end-start+1);expect(result.type).toContain('audio/');
    expect(result.bytes).toEqual(Array.from(original.slice(start,end+1)));
    if(status===416)expect(result.contentRange).toBe(`bytes */${track.bytes}`);
    else if(range)expect(result.contentRange).toBe(`bytes ${start}-${end}/${track.bytes}`);
  }
  await page.locator('#progress').evaluate(n=>{n.value='10';n.dispatchEvent(new Event('input',{bubbles:true}));});
  await expect.poll(()=>page.locator('#audio').evaluate(a=>a.currentTime)).toBeGreaterThanOrEqual(9);
  await page.locator('#expand-player').click();await page.locator('#repeat').click();await page.locator('#repeat').click();
  await page.locator('#audio').evaluate(a=>{a.currentTime=a.duration-0.15;});await expect.poll(()=>page.locator('#audio').evaluate(a=>a.currentTime),{timeout:10000}).toBeLessThan(5);
  await page.locator('#collapse-player').click();await page.locator('#brand').click();await expect(page.locator('.folder-card')).toHaveCount(collections.length);await playing(page);
  await page.locator('#expand-player').click();await page.locator('#now-folder').click();await expect(page.locator('#player')).not.toHaveClass(/expanded/);await page.locator('#play').click();
  await row(page,second).locator('.track-play').click();await expect(page.locator('#playback-error')).toContainText('غير محفوظ دون إنترنت');
  await expect.poll(()=>page.locator('#audio').getAttribute('src')).toBeNull();await expect(page.locator('#duration')).toHaveText('−٠:٠٠');
  await context.setOffline(false);
});

test('explicit saves, cache management, individual deletion and confirmed clearing preserve application assets',async({page,context})=>{
  await ready(page);
  for(const t of [track,second]){await row(page,t).locator('.save-track').click();await saved(page,t);}
  expect(await page.locator('#audio').evaluate(a=>!a.getAttribute('src')&&a.paused)).toBe(true);
  await manager(page);await expect(page.locator('.saved-row')).toHaveCount(2);
  for(const width of [320,390,768]){
    await page.setViewportSize({width,height:844});
    expect(await page.locator('#saved-audio').evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await expect(page.locator('.saved-row strong').first()).toBeVisible();
  }
  await expect(page.locator('#saved-summary')).toContainText(size(track.bytes+second.bytes));
  await page.locator('#theme-preference').evaluate(n=>{n.value='dark';n.dispatchEvent(new Event('change',{bubbles:true}));});
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
  await page.getByRole('button',{name:`حذف ${trackLabel(track)} من المقاطع المحفوظة`,exact:true}).click();await expect(page.locator('.saved-row')).toHaveCount(1);
  await page.locator('#clear-audio').click();await expect(page.locator('#confirm-cache-delete')).toBeVisible();
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
  await page.keyboard.press('Escape');expect(await entries(page)).toBe(1);
  await page.locator('#clear-audio').click();await page.locator('#confirm-clear-audio').click();await expect(page.locator('.saved-row')).toHaveCount(0);expect(await entries(page)).toBe(0);
  const cacheNames=await page.evaluate(()=>caches.keys());expect(cacheNames.some(n=>n.startsWith('media-player:/media/:'))).toBe(true);
  await context.setOffline(true);await page.goto('./');await expect(page.locator('.folder-card').first()).toBeVisible();
  await context.setOffline(false);
});

test('service worker activation removes old shell versions while preserving saved audio and original URLs',async({page,context})=>{
  await ready(page);await row(page,track).locator('.save-track').click();await saved(page);
  await page.evaluate(async()=>{await(await caches.open('media-player:/media/:outdated-test')).put('/media/old-shell',new Response('old'));await navigator.serviceWorker.register('/media/sw.js?offline-upgrade-test=2',{scope:'/media/'});});
  await expect.poll(()=>page.evaluate(()=>navigator.serviceWorker.controller?.scriptURL)).toContain('offline-upgrade-test=2');
  await expect.poll(()=>page.evaluate(async()=>!(await caches.keys()).includes('media-player:/media/:outdated-test'))).toBe(true);expect(await entries(page)).toBe(1);
  await context.setOffline(true);await row(page,track).locator('.track-play').click();await playing(page);
  expect(new URL(await page.locator('#audio').getAttribute('src')).pathname).toBe(`/media/${track.url}`);
  await context.setOffline(false);
});

test('saved recordings and interface preferences survive a real browser process restart',async({},testInfo)=>{
  test.skip(testInfo.project.name!=='chromium','Persistent-profile restart coverage runs once in Chromium; native worker playback runs in every engine.');
  const profile=await mkdtemp(path.join(os.tmpdir(),'diwan-profile-'));let context;
  try{
    context=await chromium.launchPersistentContext(profile,{headless:true,baseURL:'http://127.0.0.1:4173/media/',serviceWorkers:'allow'});
    let page=await context.newPage();await ready(page);await row(page,track).locator('.save-track').click();await saved(page);
    await page.locator('#settings-button').click();
    await page.locator('#theme-preference').selectOption('dark');await page.locator('#font-preference').selectOption('system');
    await page.locator('#numeral-preference').selectOption('western');await page.locator('#seekButtons').uncheck();
    await context.close();
    context=await chromium.launchPersistentContext(profile,{headless:true,baseURL:'http://127.0.0.1:4173/media/',serviceWorkers:'allow'});
    await context.setOffline(true);page=await context.newPage();await page.goto(`./#folder=${encodeURIComponent(track.folder)}`);await saved(page);
    await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await expect(page.locator('html')).toHaveAttribute('data-font','system');
    await page.locator('#settings-button').click();await expect(page.locator('#numeral-preference')).toHaveValue('western');await expect(page.locator('#seekButtons')).not.toBeChecked();
    await page.keyboard.press('Escape');
    await row(page,track).locator('.track-play').click();await playing(page);expect(await entries(page)).toBe(1);
  }finally{await context?.close();await rm(profile,{recursive:true,force:true});}
});

test('an existing legacy worker upgrades to the audio protocol on the first visit',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='chromium','Legacy-protocol upgrade is covered once; cache-preserving activation is covered in all three engines.');
  const {createServer}=await import('node:http');let legacy=true;
  const old="self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));";
  const current=await readFile(new URL('../../dist/sw.js',import.meta.url));
  const server=createServer(async(req,res)=>{
    if(req.url==='/media/bootstrap'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><html lang="ar" dir="rtl"><title>اختبار</title></html>');return;}
    if(req.url==='/media/sw.js'){res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'});res.end(legacy?old:current);return;}
    try{const upstream=await fetch(`http://127.0.0.1:4173${req.url}`,{method:req.method,headers:req.headers});res.writeHead(upstream.status,Object.fromEntries(upstream.headers));res.end(Buffer.from(await upstream.arrayBuffer()));}
    catch{res.writeHead(500).end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}/media/`;
  try{
    await page.goto(`${base}bootstrap`);await page.evaluate(async()=>{await navigator.serviceWorker.register('./sw.js',{scope:'./'});await navigator.serviceWorker.ready;});
    await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);legacy=false;
    await page.goto(`${base}#folder=${encodeURIComponent(track.folder)}`);
    await row(page,track).locator('.track-play').click();await playing(page);await saved(page);expect(await entries(page)).toBe(1);
  }finally{await new Promise(resolve=>server.close(resolve));}
});

test('saved-audio action text retains contrast throughout theme changes',async({page})=>{
  await ready(page);await row(page,track).locator('.save-track').click();await saved(page);await manager(page);
  for(const theme of ['dark','light']){
    await page.evaluate(theme=>{
      const button=document.querySelector('#clear-audio');
      getComputedStyle(button).color; // Flush the starting theme before changing it.
      window.DiwanTheme.set(theme);
      window.themeTransitions=button.getAnimations();
      for(const animation of window.themeTransitions)animation.pause();
    },theme);
    for(const time of [0,32.5,65,97.5,130]){
      const ratio=await page.locator('#clear-audio').evaluate((button,time)=>{
        for(const animation of window.themeTransitions)animation.currentTime=time;
        const luminance=color=>color.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
        const style=getComputedStyle(button),front=luminance(style.color),back=luminance(style.backgroundColor);
        return (Math.max(front,back)+.05)/(Math.min(front,back)+.05);
      },time);
      expect(ratio,`${theme} at ${time}ms`).toBeGreaterThanOrEqual(4.5);
    }
    await page.evaluate(()=>{for(const animation of window.themeTransitions)animation.finish();});
  }
});

test('enabled saved-audio actions retain contrast from their first frame',async({page})=>{
  await ready(page);await row(page,track).locator('.save-track').click();await saved(page);await manager(page);
  await page.evaluate(()=>window.DiwanTheme.set('dark'));
  await page.locator('#clear-audio').evaluate(button=>{
    button.disabled=true;getComputedStyle(button).opacity;
    for(const animation of button.getAnimations())animation.finish();
    button.disabled=false;
    for(const animation of button.getAnimations()){animation.pause();animation.currentTime=0;}
  });
  await expect(page.locator('#clear-audio')).toBeEnabled();
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
});
