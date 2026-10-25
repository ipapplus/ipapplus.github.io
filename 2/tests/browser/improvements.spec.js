import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { trackLabel } from '../../web/_player/library-view.js';
const manifest = JSON.parse(readFileSync(new URL('../../dist/_player/library.json', import.meta.url)));
const folder = manifest.folders.find(f => f.name === 'المعلقات');
const first = manifest.tracks.find(t => t.id === folder.tracks[0]);
const playing = async page => expect.poll(() => page.locator('#audio').evaluate(a => !a.paused && a.currentTime > 0 && Number.isFinite(a.duration))).toBe(true);
const source = page => page.locator('#audio').getAttribute('src');
const links = [
  ['حساب فواز اللعبون','https://x.com/fawaz_dr'],
  ['تصفّح المجموعة ونزّل المقاطع','https://app.box.com/s/3pjw0wv9i83mvv8p70wd2hhh97co4gk6/folder/37602376827'],
];
async function smallLibrary(page) {
  const selected = [first];
  for (const track of manifest.tracks) {
    if (!selected.some(t => t.folder === track.folder)) selected.push(track);
    if (selected.length === 3) break;
  }
  const m = structuredClone(manifest), ids = new Set(selected.map(t => t.id));
  m.tracks = m.tracks.filter(t => ids.has(t.id)); m.stats.tracks = selected.length;
  for (const f of m.folders) {
    f.tracks = f.tracks.filter(id => ids.has(id));
    f.totalTracks = selected.filter(t => !f.id || t.folder === f.id || t.folder.startsWith(`${f.id}/`)).length;
  }
  await page.route('**/_player/library.json', route => route.fulfill({json:m}));
  // Deterministic selection covers the final manifest track, not a folder-only queue.
  await page.addInitScript(() => { Math.random = () => 0.99; });
  return m.tracks;
}

test('sharing metadata is available without JavaScript and points to the actual JPEG', async ({request}) => {
  const response = await request.get('./');
  const html = await response.text();
  expect(html).toContain('<meta property="og:locale" content="ar_SA">');
  expect(html).toContain('<meta name="twitter:card" content="summary_large_image">');
  expect(html).toContain('<link rel="canonical" href="https://ipapplus.github.io/media/">');
  const image = await request.get('./_player/social-heritage-v1.jpg');
  expect(image.ok()).toBe(true); expect(image.headers()['content-type']).toContain('image/jpeg');
  expect((await image.body()).equals(readFileSync(new URL('../../web/_player/social-heritage-v1.jpg', import.meta.url)))).toBe(true);
});

test('global random button visits every nested collection without repetition and automatic next stays global', async ({page}) => {
  const selected = await smallLibrary(page);
  await page.goto('./'); await expect(page.locator('#play-random')).toBeEnabled();
  expect(await page.locator('#audio').evaluate(a => a.paused && !a.getAttribute('src'))).toBe(true);
  await page.locator('#play-random').click(); await playing(page);
  await page.locator('#expand-player').click();
  await expect(page.locator('#shuffle')).toBeEnabled();
  await expect(page.locator('#shuffle')).toHaveAttribute('aria-label','التشغيل العشوائي');
  const seen = [await source(page)];
  await page.locator('#audio').evaluate(a => { a.currentTime = a.duration - 0.15; });
  await expect.poll(() => source(page), {timeout:10000}).not.toBe(seen[0]); await playing(page);
  seen.push(await source(page));
  await page.locator('#next').click(); await playing(page); seen.push(await source(page));
  expect(new Set(seen).size).toBe(3);
  expect(new Set(seen.map(url => new URL(url).pathname))).toEqual(new Set(selected.map(t => `/media/${t.url}`)));
  expect(new Set(selected.map(t => t.folder)).size).toBe(3);
  expect(selected.every(t => t.folder.split('/').length >= 3)).toBe(true);
  await page.locator('#progress').evaluate(n => {n.value='0';n.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('#previous').click(); await playing(page); expect(await source(page)).toBe(seen[1]);
  await page.locator('#next').click(); await playing(page); expect(await source(page)).toBe(seen[2]);
  await page.locator('#next').click(); await expect(page.locator('#playback-status')).toHaveText('انتهى تشغيل مقاطع المكتبة');
  await page.locator('#repeat').click(); await expect(page.locator('#repeat')).toHaveAttribute('aria-label','تكرار المكتبة');
  await page.locator('#next').click(); await playing(page); expect(await source(page)).not.toBe(seen.at(-1));
});

test('empty-player Play starts global playback; saved global selection resumes without replacement or autoplay', async ({page}) => {
  await smallLibrary(page);
  await page.addInitScript(() => localStorage.getItem('media-player:/media/:v1') || localStorage.setItem('media-player:/media/:v1', JSON.stringify({volume:0,muted:true})));
  await page.goto('./'); await expect(page.locator('#play')).toBeEnabled();
  // Verify legacy preferences before the OS/audio backend applies its own output level.
  expect(await page.locator('#audio').evaluate(a => a.volume === document.createElement('audio').volume && !a.muted)).toBe(true);
  await page.locator('#play').click(); await playing(page);
  expect(await page.locator('#audio').evaluate(a => a.muted)).toBe(false);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('media-player:/media/:v1')))).not.toHaveProperty('volume');
  const chosen = await source(page);
  await page.locator('#progress').evaluate(n => {n.value='12';n.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('#play').click();
  await page.reload(); await expect(page.locator('#play')).toBeEnabled();
  expect(await page.locator('#audio').evaluate(a => a.paused && !a.getAttribute('src'))).toBe(true);
  await page.locator('#play').click(); await playing(page); expect(await source(page)).toBe(chosen);
  await expect.poll(() => page.locator('#audio').evaluate(a => a.currentTime)).toBeGreaterThanOrEqual(11);
  await page.locator('#next').click(); await playing(page); expect(await source(page)).not.toBe(chosen);
  await expect(page.locator('#volume,#mute')).toHaveCount(2);
});

test('manual folder selection exits global mode and preserves normal folder next and repeat preferences', async ({page}) => {
  await page.goto('./'); await page.locator('#play-random').click(); await playing(page);
  await page.locator('#expand-player').click(); await page.locator('#repeat').click(); await page.locator('#repeat').click();
  await expect(page.locator('#repeat')).toHaveAttribute('aria-label','تكرار المقطع');
  await page.locator('#collapse-player').click();
  await page.locator('#brand').click();
  await page.locator('.folder-card').filter({has:page.getByText(folder.name,{exact:true})}).click();
  await page.locator('#play-folder').click(); await playing(page);
  expect(new URL(await source(page)).pathname).toBe(`/media/${first.url}`);
  await page.locator('#expand-player').click(); await expect(page.locator('#shuffle')).toBeEnabled();
  await expect(page.locator('#shuffle')).toHaveAttribute('aria-pressed','false');
  await page.locator('#next').click(); await playing(page);
  const second = manifest.tracks.find(t => t.id === folder.tracks[1]);
  expect(new URL(await source(page)).pathname).toBe(`/media/${second.url}`);
  await page.locator('#repeat').click(); await expect(page.locator('#repeat')).toHaveAttribute('aria-label','تكرار المجموعة');
});

test('narrator is visible in both player layouts and Media Session; unrelated recordings clear attribution', async ({page}) => {
  // Test-only unrelated branch retains a real source URL; no fixtures enter the build.
  const m = structuredClone(manifest), unrelated = {...first,id:'files/تسجيلات مستقلة/01.mp3',folder:'files/تسجيلات مستقلة'};
  m.tracks.push(unrelated); m.folders.find(f => f.id === 'files').children.push(unrelated.folder);
  m.folders.push({id:unrelated.folder,name:'تسجيلات مستقلة',parent:'files',children:[],tracks:[unrelated.id],totalTracks:1,artwork:null});
  await page.route('**/_player/library.json',route => route.fulfill({json:m}));
  await page.goto(`./#folder=${encodeURIComponent(folder.id)}`); await page.locator('#play-folder').click(); await playing(page);
  await expect(page.locator('#now-title')).toHaveText(trackLabel(first));
  await expect(page.locator('#now-narrator')).toHaveText('بصوت عبدالرحمن الحميّن');
  await expect(page.locator('#now-narrator')).toBeVisible();
  const metadata = await page.evaluate(() => navigator.mediaSession?.metadata ? {
    artist:navigator.mediaSession.metadata.artist,title:navigator.mediaSession.metadata.title,artwork:navigator.mediaSession.metadata.artwork,
  } : null);
  if (metadata) { expect(metadata.artist).toBe('عبدالرحمن الحميّن'); expect(metadata.title).toBe(trackLabel(first)); expect(metadata.artwork.length).toBeGreaterThan(0); }
  await page.locator('#expand-player').click(); await expect(page.locator('#now-narrator')).toBeVisible();
  const sizes = await page.evaluate(() => ['now-title','now-narrator'].map(id => parseFloat(getComputedStyle(document.getElementById(id)).fontSize)));
  expect(sizes[1]).toBeLessThan(sizes[0]); await expect(page.locator('#volume,#mute')).toHaveCount(2);
  await page.locator('#collapse-player').click();
  await page.evaluate(id => {location.hash=`folder=${encodeURIComponent(id)}`;},unrelated.folder);
  await expect(page.locator('#folder-title')).toHaveText('تسجيلات مستقلة'); await page.locator('#play-folder').click(); await playing(page);
  await expect(page.locator('#now-narrator')).toBeHidden();
  expect(await page.evaluate(() => navigator.mediaSession?.metadata?.artist || '')).toBe('');
});

test('credits and accessible information dialog have verified links, Arabic copy, safe targets and preserve playback', async ({page}) => {
  await page.goto('./'); await expect(page.locator('#play')).toBeEnabled();
  const footer = page.locator('.library-footer');
  await expect(footer).toContainText('برمج الموقع: أحمد الغربي | Ahmed AlGhrbi'); await expect(footer).not.toContainText('فواز اللعبون');
  await expect(footer.locator('a')).toHaveCount(2);
  await expect(page.locator('a[href="https://github.com/ipapplus/media"]')).toHaveCount(0);
  await page.locator('#play').click(); await playing(page); const before = await source(page);
  await page.locator('#info-button').click(); const about = page.getByRole('dialog',{name:'عن ديوان العرب'});
  await expect(about).toBeVisible(); await expect(about).toContainText('مصدر المجموعة الصوتية، جزاه الله خيرًا.');
  await expect(about).not.toContainText('تبقى حقوق القصائد والتسجيلات لأصحابها');
  await expect(about).toContainText('ريحانة @REHANH_DE');
  expect((await about.innerText()).replace(/Ahmed AlGhrbi|@fawaz_dr|@REHANH_DE|\bX\b/g,'')).not.toMatch(/[A-Za-z]/);
  for (const [label,url] of links) await expect(about.getByRole('link',{name:label,exact:true})).toHaveAttribute('href',url);
  await expect(about.getByRole('button',{name:'إغلاق نافذة المعلومات'})).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await expect(about.getByRole('button',{name:'عودة',exact:true})).toBeFocused();
  await page.keyboard.press('Tab'); await expect(about.getByRole('button',{name:'إغلاق نافذة المعلومات'})).toBeFocused();
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
  await playing(page); expect(await source(page)).toBe(before);
  for (const width of [320,390,768]) {
    await page.setViewportSize({width,height:844}); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.keyboard.press('Escape'); await expect(about).toBeHidden(); await expect(page.locator('#info-button')).toBeFocused();
  await playing(page);
});

test('transient zero-duration metadata does not discard a restored position', async ({page}) => {
  await page.addInitScript(id => localStorage.setItem('media-player:/media/:v1', JSON.stringify({last:{id,position:21},speed:1.25})), first.id);
  let release;
  const gate = new Promise(resolve => {release=resolve;});
  await page.route('**/*.mp3', async route => {await gate; await route.continue();});
  await page.goto('./'); await expect(page.locator('#now-title')).toHaveText(trackLabel(first));
  await page.locator('#play').click();
  try {
    await page.locator('#audio').evaluate(a => {
      Object.defineProperty(a,'duration',{get:() => 0,configurable:true});
      a.dispatchEvent(new Event('loadedmetadata'));
      delete a.duration;
    });
    await expect(page.locator('#position')).toHaveText('٠:٢١');
  } finally {release();}
  await playing(page);
  await expect.poll(() => page.locator('#audio').evaluate(a => a.currentTime)).toBeGreaterThanOrEqual(20);
});
