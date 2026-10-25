import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {downloadSize} from '../../web/_player/media-actions.js';
const manifest=JSON.parse(readFileSync(new URL('../../dist/_player/library.json',import.meta.url)));
const first=[...manifest.tracks].sort((a,b)=>a.bytes-b.bytes)[0];
const folder=manifest.folders.find(f=>f.id===first.folder);
const second=manifest.tracks.find(t=>t.id===folder.tracks[folder.tracks.indexOf(first.id)+1]);
const publicURL=t=>`https://ipapplus.github.io/media/${t.url}`;
// Exact data matching avoids assumptions about numeric or duplicate display titles.
const trackRow=(page,t=first)=>page.locator('.track-row').filter({has:page.locator('.track-play')}).and(page.locator(`[data-track=${JSON.stringify(t.id)}]`));
async function open(page){await page.goto(`./#folder=${encodeURIComponent(first.folder)}`);await expect(trackRow(page)).toBeVisible();}
async function safari(page,extra={}){
  await page.addInitScript(extra=>{
    Object.defineProperty(navigator,'vendor',{value:'Apple Computer, Inc.',configurable:true});
    Object.defineProperty(navigator,'userAgent',{value:extra.ua||'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',configurable:true});
    Object.defineProperty(navigator,'standalone',{get:()=>window.testStandalone||extra.standalone||false,configurable:true});
    const original=window.matchMedia.bind(window);
    window.testDisplay=false;window.testDisplayListeners=[];
    window.matchMedia=query=>query==='(display-mode: standalone)'?{get matches(){return window.testDisplay||extra.display||false;},addEventListener:(name,fn)=>window.testDisplayListeners.push(fn),addListener:fn=>window.testDisplayListeners.push(fn)}:original(query);
  },extra);
}
async function clipboard(page,mode='success'){
  await page.addInitScript(mode=>{
    window.copied=[];window.fallback=[];
    Object.defineProperty(navigator,'clipboard',{value:mode==='missing'?undefined:{writeText:async text=>{if(mode!=='success')throw Error('Denied');window.copied.push(text);}},configurable:true});
    document.execCommand=command=>{const area=document.querySelector('textarea');window.fallback.push({command,value:area?.value,start:area?.selectionStart,end:area?.selectionEnd,readOnly:area?.readOnly});return mode!=='failure';};
  },mode);
}

test('copy uses the original public encoded URL, waits for success and never starts playback',async({page})=>{
  await clipboard(page);await open(page);
  await trackRow(page).getByRole('button',{name:'نسخ الرابط',exact:true}).click();
  await expect(page.locator('#toast')).toHaveText('نُسخ رابط المقطع');await expect(page.locator('#toast')).toHaveClass('global-toast show');
  expect(await page.evaluate(()=>window.copied)).toEqual([publicURL(first)]);
  expect(decodeURIComponent(publicURL(first))).toContain(first.id);
  expect(await page.locator('#audio').evaluate(a=>a.paused&&!a.getAttribute('src'))).toBe(true);
  expect(await page.evaluate(()=>window.fallback)).toEqual([]);
  await expect(page.locator('#toast')).not.toHaveClass(/show/,{timeout:4000});
  await expect(page.locator('#player-track-actions')).toBeHidden();
});

test('denied clipboard uses the selected readonly textarea, restores focus and removes the fallback',async({page})=>{
  await clipboard(page,'denied');await open(page);
  const button=trackRow(page).getByRole('button',{name:'نسخ الرابط',exact:true});
  await button.click();await expect(page.locator('#toast')).toHaveText('نُسخ رابط المقطع');
  expect(await page.evaluate(()=>window.fallback)).toEqual([{command:'copy',value:publicURL(first),start:0,end:publicURL(first).length,readOnly:true}]);
  await expect(page.locator('textarea')).toHaveCount(0);await expect(button).toBeFocused();
});
test('missing clipboard still copies; two failed methods never report success',async({page})=>{
  await clipboard(page,'failure');await open(page);
  await trackRow(page).getByRole('button',{name:'نسخ الرابط',exact:true}).click();
  await expect(page.locator('#toast')).toHaveText('تعذّر نسخ الرابط');await expect(page.locator('textarea')).toHaveCount(0);
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:undefined,configurable:true}));
  await page.evaluate(()=>{document.execCommand=()=>true;});
  await trackRow(page).getByRole('button',{name:'نسخ الرابط',exact:true}).click();
  await expect(page.locator('#toast')).toHaveText('نُسخ رابط المقطع');
});
test('success feedback waits until the clipboard promise actually resolves',async({page})=>{
  await clipboard(page);await open(page);
  await page.evaluate(()=>{navigator.clipboard.writeText=()=>new Promise(resolve=>{window.finishCopy=resolve;});});
  await trackRow(page).getByRole('button',{name:'نسخ الرابط',exact:true}).click();
  await expect(page.locator('#toast')).not.toHaveClass(/show/);
  await page.evaluate(()=>window.finishCopy());await expect(page.locator('#toast')).toHaveText('نُسخ رابط المقطع');
});

test('regular Safari download is a direct anchor with original filename, bytes and Arabic decimal size',async({page})=>{
  await safari(page);await open(page);
  const link=trackRow(page).getByRole('link',{name:/تنزيل/});await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href',`http://127.0.0.1:4173/media/${first.url}`);await expect(link).toHaveAttribute('download',first.name);
  await expect(link).toHaveAttribute('target','_blank');await expect(link).toHaveAttribute('rel','noopener noreferrer');
  await expect(link.locator('.download-size')).toHaveText(downloadSize(first.bytes));
  await expect(trackRow(page).locator('.track-path')).toHaveText('مقطع صوتي');
  const requestBefore=await page.locator('#audio').getAttribute('src');
  const event=page.waitForEvent('download');await link.click();const download=await event;
  expect(download.suggestedFilename()).toBe(first.name);
  const saved=readFileSync(await download.path()),original=readFileSync(new URL(`../../dist/${first.id}`,import.meta.url));
  expect(createHash('sha256').update(saved).digest('hex')).toBe(createHash('sha256').update(original).digest('hex'));
  expect(await page.locator('#audio').getAttribute('src')).toBe(requestBefore);
  expect(await page.locator('#audio').evaluate(a=>a.paused)).toBe(true);
  expect(await page.locator('#toast').textContent()).not.toContain('تم تنزيل');
});

test('worker download fallback rejects partial or truncated files with Arabic failure feedback',async({page})=>{
  await safari(page);await open(page);
  await page.evaluate(()=>Object.defineProperty(navigator.serviceWorker,'controller',{value:{},configurable:true}));
  let downloads=0;page.on('download',()=>downloads++);
  for(const status of [206,200]){
    await page.evaluate(status=>{window.fetch=async()=>new Response('incomplete',{status});},status);
    await trackRow(page).locator('.download-audio').click();
    await expect(page.locator('#toast')).toHaveText('تعذّر تنزيل المقطع. تحقق من اتصالك بالإنترنت وأعد المحاولة.');
    await expect(trackRow(page).locator('.download-audio')).not.toHaveAttribute('aria-busy');
  }
  expect(downloads).toBe(0);expect(await page.locator('#audio').evaluate(a=>a.paused&&!a.getAttribute('src'))).toBe(true);
});

for(const [name,extra] of [['iPhone standalone',{standalone:true}],['desktop standalone',{display:true,ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'}],['iOS Chrome',{ua:'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Version/18.0 CriOS/140 Mobile/15E148 Safari/604.1'}]]) {
  test(`${name} hides download and its size but retains copy in rows and expanded player`,async({page})=>{
    await safari(page,extra);await clipboard(page);await open(page);
    await expect(trackRow(page).locator('.download-audio')).toBeHidden();await expect(trackRow(page).locator('.download-size')).toBeHidden();
    await trackRow(page).getByRole('button',{name:'نسخ الرابط',exact:true}).click();await expect(page.locator('#toast')).toHaveText('نُسخ رابط المقطع');
    await trackRow(page).locator('.track-play').click();await expect(page.locator('#now-title')).not.toHaveText('لكل قصيدة حكاية');
    await page.locator('#expand-player').click();
    await expect(page.locator('#player-track-actions .copy-link')).toBeVisible();await expect(page.locator('#player-track-actions .download-audio')).toBeHidden();
    expect(await page.locator('#player-track-actions .download-audio').evaluate(n=>n.getClientRects().length)).toBe(0);
  });
}
test('native non-Safari browsers hide downloads; lifecycle and display-mode changes refresh Safari actions',async({page,browserName})=>{
  await open(page);
  if(browserName!=='webkit')await expect(trackRow(page).locator('.download-audio')).toBeHidden();
  await safari(page);await page.reload();await expect(trackRow(page).locator('.download-audio')).toBeVisible();
  await page.evaluate(()=>{window.testDisplay=true;window.testDisplayListeners.forEach(fn=>fn());});
  await expect(trackRow(page).locator('.download-audio')).toBeHidden();
  await page.evaluate(()=>{window.testDisplay=false;window.dispatchEvent(new Event('pageshow'));});
  await expect(trackRow(page).locator('.download-audio')).toBeVisible();
  await page.evaluate(()=>{window.testStandalone=true;window.dispatchEvent(new Event('focus'));});
  await expect(trackRow(page).locator('.download-audio')).toBeHidden();
});

test('expanded actions follow selected tracks, preserve playback, and fit both themes on small phones',async({page})=>{
  await safari(page);await clipboard(page);await open(page);await trackRow(page).locator('.track-play').click();
  await expect.poll(()=>page.locator('#audio').evaluate(a=>!a.paused&&a.currentTime>0)).toBe(true);
  const before=await page.locator('#audio').getAttribute('src');
  await trackRow(page).getByRole('button',{name:'نسخ الرابط',exact:true}).click();
  expect(await page.locator('#audio').getAttribute('src')).toBe(before);expect(await page.locator('#audio').evaluate(a=>!a.paused)).toBe(true);
  for(const theme of ['light','dark']){
    await page.evaluate(theme=>window.DiwanTheme.set(theme),theme);
    for(const width of [320,390,768]){
      await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      const rect=await trackRow(page).locator('.track-tools').boundingBox();expect(rect.width).toBeLessThan(width);
    }
    await page.setViewportSize({width:390,height:844});
    expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
    await page.locator('#expand-player').click();await expect(page.locator('#player-track-actions')).toBeVisible();
    await page.locator('#player-track-actions .copy-link').click();expect((await page.evaluate(()=>window.copied)).at(-1)).toBe(publicURL(first));
    expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
    await page.locator('#collapse-player').click();
  }
  await page.setViewportSize({width:320,height:667});
  await page.locator('#expand-player').click();
  expect((await page.locator('#collapse-player').boundingBox()).y).toBeGreaterThanOrEqual(0);
  await page.locator('#next').click();
  await expect(page.locator('#player-track-actions .download-audio')).toHaveAttribute('href',`http://127.0.0.1:4173/media/${second.url}`);
  await expect(page.locator('#player-track-actions .download-size')).toHaveText(downloadSize(second.bytes));
  await page.locator('#player-track-actions .copy-link').click();expect((await page.evaluate(()=>window.copied)).at(-1)).toBe(publicURL(second));
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.locator('#volume,#mute')).toHaveCount(2);await expect(page.locator('input[type=search],#search')).toHaveCount(0);
});

test.describe('existing offline store integration',()=>{
  test.use({serviceWorkers:'allow'});
  test('saved recording still copies its public link and downloads original bytes offline without altering the cache',async({page,context})=>{
    await safari(page);await clipboard(page);await open(page);
    await page.evaluate(()=>navigator.serviceWorker.ready);
    await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
    await page.reload();await expect(trackRow(page)).toBeVisible();
    await trackRow(page).locator('.track-play').click();
    await expect(trackRow(page).locator('.cache-indicator')).toHaveText('محفوظ دون إنترنت',{timeout:20000});
    const source=await page.locator('#audio').getAttribute('src');
    await expect.poll(()=>page.locator('#audio').evaluate(a=>!a.paused&&a.currentTime>0)).toBe(true);
    const onlineEvent=page.waitForEvent('download');await trackRow(page).locator('.download-audio').click();
    const onlineDownload=await onlineEvent;expect(onlineDownload.suggestedFilename()).toBe(first.name);
    expect(readFileSync(await onlineDownload.path()).byteLength).toBe(first.bytes);
    expect(await page.locator('#audio').getAttribute('src')).toBe(source);
    expect(await page.locator('#audio').evaluate(a=>!a.paused)).toBe(true);
    await page.locator('#play').click();
    await context.setOffline(true);await page.reload();await expect(trackRow(page)).toBeVisible();
    await trackRow(page).getByRole('button',{name:'نسخ الرابط',exact:true}).click();
    expect((await page.evaluate(()=>window.copied)).at(-1)).toBe(publicURL(first));
    const event=page.waitForEvent('download');await trackRow(page).locator('.download-audio').click();const download=await event;
    const expected=createHash('sha256').update(readFileSync(new URL(`../../dist/${first.id}`,import.meta.url))).digest('hex');
    expect(createHash('sha256').update(readFileSync(await download.path())).digest('hex')).toBe(expected);
    const cached=await page.evaluate(async url=>{
      const response=await(await caches.open('diwan-audio:/media/:v1')).match(new URL(url,location.href));
      return {status:response.status,bytes:(await response.arrayBuffer()).byteLength};
    },`/media/${first.url}`);
    expect(cached).toEqual({status:200,bytes:first.bytes});
    expect(await page.locator('#audio').evaluate(a=>a.paused)).toBe(true);
    // The same cached selection exposes copy, but no download, in installed mode.
    await page.evaluate(()=>{window.testStandalone=true;window.dispatchEvent(new Event('pageshow'));});
    await expect(trackRow(page).locator('.download-audio')).toBeHidden();
    await page.locator('#expand-player').click();await page.locator('#player-track-actions .copy-link').click();
    expect((await page.evaluate(()=>window.copied)).at(-1)).toBe(publicURL(first));
    await expect(page.locator('#player-track-actions .download-audio')).toBeHidden();
    await context.setOffline(false);
  });
});
