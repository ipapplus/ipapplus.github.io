import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {readFileSync} from 'node:fs';
const manifest=JSON.parse(readFileSync(new URL('../../dist/_player/library.json',import.meta.url)));
const root=manifest.folders.find(f=>f.name.startsWith('مقاطع صوتية بصوت'));
const folder=manifest.folders.find(f=>f.name==='المعلقات');
const loaded=async page=>{await page.goto('./');await expect(page.locator('.folder-card')).toHaveCount(root.children.length);};
const settings=async page=>{await page.locator('#settings-button').click();};
const playing=async page=>expect.poll(()=>page.locator('#audio').evaluate(a=>!a.paused&&a.currentTime>0)).toBe(true);
const close=page=>page.keyboard.press('Escape');

test('font restores before stylesheet, uses local sources only, toggles and persists',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('media-player:/media/:v1',JSON.stringify({font:'system'})));
  let release;const gate=new Promise(resolve=>release=resolve);
  await page.route('**/style.css',async route=>{await gate;await route.continue();});
  const navigation=page.goto('./');
  try{await expect(page.locator('html')).toHaveAttribute('data-font','system');}finally{release();}
  await navigation;await expect(page.locator('#font-toggle')).toHaveAttribute('aria-pressed','true');
  await page.locator('#font-toggle').click();await expect(page.locator('html')).toHaveAttribute('data-font','heritage');
  await settings(page);await expect(page.locator('#font-preference')).toHaveValue('heritage');
  await page.locator('#font-preference').selectOption('system');await expect(page.locator('#toast')).toHaveText('خط الجهاز مفعّل');
  expect(await page.locator('#toast').evaluate(n=>n.matches(':popover-open'))).toBe(true);
  await page.reload();await expect(page.locator('html')).toHaveAttribute('data-font','system');
  expect(await page.locator('body').evaluate(n=>getComputedStyle(n).fontFamily)).toContain('DiwanLocalArabic');
  const css=await(await page.request.get('./_player/style.css')).text();
  const face=css.match(/@font-face\s*\{ font-family:DiwanLocalArabic;([^}]+)}/)[1];
  expect(face).toContain('local("Arabic UI Text Medium")');expect(face).not.toContain('url(');
});

test('numerals update playback, speeds, counts, steps and seeking without changing audio URLs',async({page})=>{
  await page.goto(`./#folder=${encodeURIComponent(folder.id)}`);await page.locator('#play-folder').click();await playing(page);
  const url=await page.locator('#audio').getAttribute('src');
  await settings(page);await page.locator('#numeral-preference').selectOption('western');
  await expect(page.locator('#track-count')).toContainText('10');
  await expect(page.locator('#position')).toHaveText(/^[0-9:]+$/);
  await expect(page.locator('#speed option[value="1.25"]')).toHaveText('1.25×');
  await expect(page.locator('#forward')).toHaveAttribute('aria-label','التقديم 10 ثوانٍ');
  await expect(page.locator('.step-number').first()).toHaveText('1');
  await expect(page.locator('#rewind svg text')).toHaveText('10');
  await playing(page);expect(await page.locator('#audio').getAttribute('src')).toBe(url);
  await page.reload();await expect(page.locator('#track-count')).toContainText('10');
  await settings(page);await expect(page.locator('#numeral-preference')).toHaveValue('western');
  await page.locator('#numeral-preference').selectOption('eastern');await expect(page.locator('#track-count')).toContainText('١٠');
  await expect(page.locator('#forward')).toHaveAttribute('aria-label','التقديم ١٠ ثوانٍ');
});

test('optional switches persist independently and hidden controls preserve queue and caching preferences',async({page})=>{
  await page.goto(`./#folder=${encodeURIComponent(folder.id)}`);await page.locator('#play-folder').click();await playing(page);
  await page.locator('#expand-player').click();await page.locator('#shuffle').click();await page.locator('#repeat').click();
  await page.locator('#collapse-player').click();await settings(page);
  for(const id of ['seekButtons','shuffleControl','repeatControl','actionToasts'])await page.locator(`#${id}`).uncheck();
  await expect(page.locator('#controlHints')).toBeChecked();await close(page);
  await page.locator('#expand-player').click();
  for(const id of ['rewind','forward','shuffle','repeat'])await expect(page.locator(`#${id}`)).toBeHidden();
  await expect(page.locator('#play')).toBeVisible();await expect(page.locator('#next')).toBeVisible();await playing(page);
  await page.reload();await settings(page);
  for(const id of ['seekButtons','shuffleControl','repeatControl','actionToasts'])await expect(page.locator(`#${id}`)).not.toBeChecked();
  await page.locator('#repeatControl').check();await close(page);await page.locator('#expand-player').click();
  await expect(page.locator('#repeat')).toHaveAttribute('aria-label','تكرار المجموعة');
  await expect(page.locator('#shuffle')).toHaveAttribute('aria-pressed','true');
  await page.locator('#repeat').click();await expect(page.locator('#toast')).not.toHaveClass(/show/);
});

test('action toasts replace one another and hints are keyboard accessible and independently disabled',async({page})=>{
  await page.goto(`./#folder=${encodeURIComponent(folder.id)}`);await page.locator('#play-folder').click();await playing(page);
  await page.locator('#expand-player').click();
  await page.locator('#shuffle').click();await expect(page.locator('#toast')).toHaveText('التشغيل العشوائي مفعّل');
  await page.locator('#shuffle').click();await expect(page.locator('#toast')).toHaveText('التشغيل العشوائي متوقف');
  for(const message of ['تكرار المجموعة','تكرار المقطع','التكرار متوقف']){
    await page.locator('#repeat').click();await expect(page.locator('#toast')).toHaveText(message);
  }
  await page.locator('#speed').selectOption('1.5');await expect(page.locator('#toast')).toHaveText('سرعة التشغيل: ١٫٥×');
  await page.locator('#forward').click();await expect(page.locator('#toast')).toHaveText('تقديم ١٠ ثوانٍ');
  await page.locator('#rewind').click();await expect(page.locator('#toast')).toHaveText('رجوع ١٠ ثوانٍ');
  await page.locator('#next').focus();await expect(page.locator('#control-hint')).toHaveText('المقطع التالي');
  await expect(page.locator('#next')).toHaveAttribute('aria-describedby','control-hint');
  await page.locator('#collapse-player').click();await settings(page);await page.locator('#controlHints').uncheck();await close(page);
  await page.locator('#expand-player').click();await page.locator('#next').focus();await expect(page.locator('#control-hint')).toBeHidden();
});

test('logical root, legacy deep links and concise credits retain every collection',async({page})=>{
  await loaded(page);await page.locator('#menu').click();
  await expect(page.locator('#home')).toHaveText('مقاطع صوتية بصوت الشيخ الدكتور عبدالرحمن الحميّن');
  await expect(page.locator('#tree>button')).toHaveCount(root.children.length);
  await expect(page.locator('#sidebar')).not.toContainText(/كل المجموعات|المكتبة بأكملها/);
  await page.locator('#tree>button').first().click();
  await expect(page.locator('#breadcrumbs a').first()).toHaveText('مقاطع صوتية بصوت الشيخ الدكتور عبدالرحمن الحميّن');
  await expect(page.locator('#breadcrumbs a')).toHaveCount(2);
  await page.locator('#back').click();await expect(page.locator('#hero')).toBeVisible();await expect(page.locator('#back')).toBeDisabled();
  for(const id of ['', 'files', root.id]){
    await page.goto(`./#folder=${encodeURIComponent(id)}`);await expect(page.locator('#hero')).toBeVisible();
    await expect(page.locator('.folder-card')).toHaveCount(root.children.length);
  }
  await expect(page.locator('.library-footer')).not.toContainText('فواز');
  await expect(page.locator('.library-footer a')).toHaveCount(2);
  await expect(page.locator('a[href="https://github.com/ipapplus/media"]')).toHaveCount(0);
  await page.locator('#info-button').click();await expect(page.locator('#about a[href="https://x.com/fawaz_dr"]')).toBeVisible();
  await expect(page.locator('#about a[href^="https://app.box.com/"]')).toBeVisible();
});

test('both fonts and numerals fit phone, tablet and desktop in both themes with accessible dialogs',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await loaded(page);
  for(const font of ['heritage','system'])for(const numerals of ['eastern','western'])for(const theme of ['light','dark']){
    await settings(page);await page.locator('#font-preference').selectOption(font);await page.locator('#numeral-preference').selectOption(numerals);await page.locator('#theme-preference').selectOption(theme);await close(page);
    for(const width of [320,375,390,430,768,1440]){
      await page.setViewportSize({width,height:900});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      const rects=await page.locator('.header-inner>.icon-button').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,height:r.height};}));
      for(const r of rects){expect(r.left).toBeGreaterThanOrEqual(0);expect(r.right).toBeLessThanOrEqual(width);expect(r.width).toBeGreaterThanOrEqual(44);expect(r.height).toBeGreaterThanOrEqual(44);}
    }
  }
  await page.setViewportSize({width:390,height:844});await settings(page);
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
  expect(await page.locator('#settings').evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);
  await close(page);await page.locator('#expand-player').click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('automatic theme follows system changes on reload and foreground events without rewriting manual choices',async({page})=>{
  await page.emulateMedia({colorScheme:'light'});await loaded(page);await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  await page.emulateMedia({colorScheme:'dark'});await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.evaluate(()=>{document.documentElement.dataset.theme='light';window.dispatchEvent(new Event('pageshow'));});
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.evaluate(()=>{document.documentElement.dataset.theme='light';document.dispatchEvent(new Event('visibilitychange'));});
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await settings(page);await page.locator('#theme-preference').selectOption('light');await close(page);
  await page.emulateMedia({colorScheme:'light'});await page.emulateMedia({colorScheme:'dark'});await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  await settings(page);await expect(page.locator('#theme-preference')).toHaveValue('light');
});

test('browser text enlargement reflows without horizontal overflow or inaccessible settings',async({page})=>{
  await loaded(page);
  await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await page.setViewportSize({width:390,height:844});await settings(page);
  expect(await page.locator('#settings').evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);
  await page.locator('#numeral-preference').selectOption('western');await close(page);
  await page.locator('#expand-player').click();await expect(page.locator('#play')).toBeVisible();
  expect(await page.locator('#player').evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);
});

test('unavailable local proprietary font falls back without a download or broken Arabic layout',async({page})=>{
  const proprietaryRequests=[];page.on('request',r=>{if(/PFHK|iOS26|DiwanLocal/i.test(r.url()))proprietaryRequests.push(r.url());});
  await page.route('**/style.css',async route=>{
    const response=await route.fetch();const css=(await response.text()).replace(/local\("(?:Arabic UI Text Medium|IOS 15 T Medium|iOS26M-GSR)"\)/g,'local("UnavailableDiwanTestFont")');
    await route.fulfill({response,body:css});
  });
  await loaded(page);await page.locator('#font-toggle').click();
  await page.evaluate(()=>document.fonts.ready);
  // WebKit can report a missing local face as loaded. Verify the actual glyph
  // metrics match the fallback chain rather than relying on that status flag.
  const metrics=await page.evaluate(()=>{
    const context=document.createElement('canvas').getContext('2d'),family=getComputedStyle(document.body).fontFamily;
    context.font=`32px ${family}`;const actual=context.measureText('ديوان العرب كلمات عبرت الدهور').width;
    context.font=`32px ${family.replace('DiwanLocalArabic,','')}`;
    return {actual,fallback:context.measureText('ديوان العرب كلمات عبرت الدهور').width};
  });
  expect(metrics.actual).toBeCloseTo(metrics.fallback,2);
  await expect(page.locator('#hero-title')).toBeVisible();await expect(page.locator('.folder-card').first()).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(proprietaryRequests).toEqual([]);
});
