import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const loaded=async page=>{await page.goto('./');await expect(page.locator('.folder-card').first()).toBeVisible();};
const axe=async page=>expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);

test('system appearance is the default; manual preferences survive refresh and system changes',async({page})=>{
  await page.emulateMedia({colorScheme:'dark'});await loaded(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.locator('#settings-button').click();await expect(page.locator('#theme-preference')).toHaveValue('auto');await page.keyboard.press('Escape');
  await page.locator('#theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  await expect(page.locator('#theme-toggle')).toHaveAttribute('aria-label','التبديل إلى المظهر الداكن');
  await page.locator('#theme-toggle').click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await expect(page.locator('#theme-toggle')).toHaveAttribute('aria-label','التبديل إلى المظهر الفاتح');
  await expect(page.locator('meta[name=theme-color]')).toHaveAttribute('content','#241811');
  await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.emulateMedia({colorScheme:'light'});await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.locator('.folder-card').first().click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.locator('#settings-button').click();await page.locator('#theme-preference').selectOption('auto');
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  await page.emulateMedia({colorScheme:'dark'});await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.emulateMedia({colorScheme:'light'});await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  await page.locator('#theme-preference').selectOption('light');await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
});

test('stored dark appearance resolves before the blocking stylesheet completes',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('diwan-theme:/media/:v1','dark'));
  let release;const gate=new Promise(resolve=>{release=resolve;});
  await page.route('**/_player/style.css',async route=>{await gate;await route.continue();});
  const navigation=page.goto('./');
  try {await expect(page.locator('html')).toHaveAttribute('data-theme','dark');}
  finally{release();}
  await navigation;await expect(page.locator('meta[name=theme-color]')).toHaveAttribute('content','#241811');
});

test('night palette covers library, navigation, player, dialogs and phone layouts with accessible contrast',async({page})=>{
  await loaded(page);await page.locator('#theme-toggle').click();await page.evaluate(()=>document.fonts.ready);
  for(const width of [320,375,390,430,768,1440]){
    await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await page.setViewportSize({width:390,height:844});await axe(page);
  await page.locator('#menu').click();await axe(page);await page.locator('#close-menu').click();
  await page.locator('.folder-card').first().click();await axe(page);
  await page.locator('#play-folder').click();await page.locator('#expand-player').click();await axe(page);
  expect(await page.locator('#player').evaluate(n=>getComputedStyle(n).backgroundColor)).toBe('rgb(33, 23, 16)');
  await page.locator('#collapse-player').click();await page.locator('#info-button').click();await axe(page);await page.keyboard.press('Escape');
  await page.locator('#settings-button').click();await axe(page);
  await page.locator('#cache-settings').click();await axe(page);await page.keyboard.press('Escape');await page.keyboard.press('Escape');
  await page.locator('#brand').click();await page.locator('#install-app').click();await expect(page.locator('#install-guide')).toBeVisible();await axe(page);
  expect(await page.locator('#heritage-art').evaluate(n=>getComputedStyle(n).filter)).toBe('none');
  expect((await page.locator('body').innerText()).replaceAll('Ahmed AlGhrbi','')).not.toMatch(/[A-Za-z]/);
});

test('iPhone installation is explicit, Arabic and inline above the persistent player',async({page})=>{
  await page.addInitScript(()=>Object.defineProperty(navigator,'userAgent',{value:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1'}));
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});await loaded(page);
  await expect(page.locator('#install-app')).toHaveText('تثبيت التطبيق');await expect(page.locator('#install-guide')).toBeHidden();
  await page.locator('#install-app').click();await expect(page.locator('#install-title')).toHaveText('تثبيت ديوان العرب');
  await expect(page.locator('#install-ios li')).toHaveCount(6);await expect(page.locator('#install-ios')).toBeVisible();
  await expect(page.locator('#install-ios')).toContainText('«المزيد» (…)');await expect(page.locator('#install-ios')).toContainText('«فتح كتطبيق ويب»');
  for(const viewport of [{width:390,height:844},{width:320,height:667}]) {
    await page.setViewportSize(viewport);
    // Header measurements reach CSS asynchronously through ResizeObserver.
    const headerHeight=await page.locator('.topbar').evaluate(n=>Math.ceil(n.getBoundingClientRect().height));
    await expect.poll(()=>page.locator('html').evaluate(n=>parseFloat(getComputedStyle(n).getPropertyValue('--header-height')))).toBe(headerHeight);
    await page.locator('#install-guide').evaluate(n=>n.scrollIntoView({block:'start',behavior:'instant'}));
    const rect=await page.evaluate(()=>({guide:document.querySelector('#install-guide').getBoundingClientRect(),player:document.querySelector('#player').getBoundingClientRect().top,header:document.querySelector('.topbar').getBoundingClientRect().bottom}));
    expect(rect.guide.bottom).toBeLessThanOrEqual(rect.player);expect(rect.guide.top).toBeGreaterThanOrEqual(rect.header);
    expect(await page.locator('#install-guide').evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await page.keyboard.press('Escape');await expect(page.locator('#install-guide')).toBeHidden();await expect(page.locator('#install-app')).toBeFocused();
});

test('supported installation event is prompted synchronously by the click and handles acceptance',async({page})=>{
  await page.addInitScript(()=>Object.defineProperty(navigator,'userAgent',{value:'Mozilla/5.0 (X11; Linux x86_64) Chrome/156.0'}));
  await loaded(page);
  await page.evaluate(()=>{const event=new Event('beforeinstallprompt',{cancelable:true});event.prompt=()=>{window.installCalled=true;window.installActive=navigator.userActivation?.isActive;return Promise.resolve();};event.userChoice=Promise.resolve({outcome:'accepted'});window.dispatchEvent(event);});
  await page.locator('#install-app').click();expect(await page.evaluate(()=>window.installCalled)).toBe(true);
  const activated=await page.evaluate(()=>window.installActive);if(activated!==undefined)expect(activated).toBe(true);
  await expect(page.locator('#install-app')).toBeHidden();await expect(page.locator('#install-guide')).toBeHidden();
});

test('dismissed native installation remains optional and unsupported browsers get guidance on demand',async({page})=>{
  await page.addInitScript(()=>Object.defineProperty(navigator,'userAgent',{value:'Mozilla/5.0 (X11; Linux x86_64) Chrome/156.0'}));
  await loaded(page);
  await page.evaluate(()=>{const event=new Event('beforeinstallprompt',{cancelable:true});event.prompt=()=>Promise.resolve();event.userChoice=Promise.resolve({outcome:'dismissed'});window.dispatchEvent(event);});
  await page.locator('#install-app').click();await expect(page.locator('#install-status')).toContainText('لاحقًا');
  await expect(page.locator('#install-guide')).toBeHidden();await page.locator('#install-app').click();
  await expect(page.locator('#install-other')).toBeVisible();await expect(page.locator('#install-ios')).toBeHidden();await page.locator('#close-install').click();
});

test('standalone mode hides installation and manifest stays inside /media/',async({page})=>{
  await page.addInitScript(()=>Object.defineProperty(navigator,'standalone',{value:true}));await loaded(page);
  await expect(page.locator('#install-app')).toBeHidden();await expect(page.locator('#install-guide')).toBeHidden();
  const manifest=await(await page.request.get('./manifest.webmanifest')).json();
  expect(manifest.name).toBe('ديوان العرب');expect(manifest.lang).toBe('ar');expect(manifest.dir).toBe('rtl');expect(manifest.display).toBe('standalone');
  expect(new URL(manifest.scope,page.url()).pathname).toBe('/media/');expect(new URL(manifest.start_url,page.url()).pathname).toBe('/media/');
});

test('storage persistence is requested only by an explicit supported user action',async({page})=>{
  await page.addInitScript(()=>{
    window.persistCalls=0;
    Object.defineProperty(navigator,'storage',{value:{persist:()=>{window.persistCalls++;return Promise.resolve(false);}},configurable:true});
  });
  await loaded(page);expect(await page.evaluate(()=>window.persistCalls)).toBe(0);
  await page.locator('#settings-button').click();await page.locator('#cache-settings').click();
  await page.locator('#persist-storage').click();await expect.poll(()=>page.evaluate(()=>window.persistCalls)).toBe(1);
  await expect(page.locator('#persistence-status')).toContainText('لم يمنح المتصفح الإذن');
});
