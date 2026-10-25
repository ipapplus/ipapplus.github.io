import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test.beforeEach(async({page})=>{await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.resolve()},configurable:true}));});
const subtitle='إرثٌ يُروى، وجمالٌ يُسمع بصوت الشيخ الدكتور عبدالرحمن الحميّن';
const creator='برمج الموقع: أحمد الغربي | Ahmed AlGhrbi';
const loaded=async page=>{await page.goto('./');await expect(page.locator('.folder-card').first()).toBeVisible();};
const openTracks=async page=>{await loaded(page);await page.locator('.folder-card').first().click();await page.locator('#play-folder').click();await expect.poll(()=>page.locator('#audio').evaluate(a=>!a.paused&&a.currentTime>0)).toBe(true);};
const above=async(page)=>{
  const result=await page.locator('#toast').evaluate(n=>{const r=n.getBoundingClientRect(),close=document.querySelector('#collapse-player').getBoundingClientRect();return getComputedStyle(n).position==='fixed'&&getComputedStyle(n).pointerEvents==='none'&&r.top>=0&&r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&(!document.querySelector('#player').classList.contains('expanded')||r.right<=close.left||r.left>=close.right);});
  expect(result).toBe(true);
};
test('three attribution cards, restored social links, safe destinations and Return/Escape',async({page})=>{
  await loaded(page);
  await expect(page.locator('.library-footer>span,.library-footer>p')).toHaveText(['ديوان العرب',subtitle,'❖',creator]);
  await expect(page.locator('.social-links a')).toHaveText(['موقعي','حسابي']);
  await page.locator('#info-button').click();
  await expect(page.locator('#about .about-identity>*')).toHaveText(['ديوان العرب',subtitle,'❖']);
  await expect(page.locator('.attribution-card')).toHaveCount(3);
  const links=page.locator('#about .attribution-card a');
  for(const [i,url] of ['https://x.com/ipapplus','https://x.com/fawaz_dr','https://app.box.com/s/3pjw0wv9i83mvv8p70wd2hhh97co4gk6/folder/37602376827'].entries()){
    await expect(links.nth(i)).toHaveAttribute('href',url);await expect(links.nth(i)).toHaveAttribute('rel','noopener noreferrer');await expect(links.nth(i)).toHaveAttribute('target','_blank');
  }
  await expect(page.locator('.attribution-card').nth(2)).toContainText('ريحانة @REHANH_DE');
  await expect(page.locator('#about')).not.toContainText('الأخت');await expect(page.locator('#about a[href*="REHANH"]')).toHaveCount(0);
  expect(await page.locator('.collection-download').evaluate(n=>getComputedStyle(n).textDecorationLine)).toBe('none');
  await page.getByRole('button',{name:'عودة',exact:true}).click();await expect(page.locator('#info-button')).toBeFocused();
  await page.locator('#info-button').click();await page.keyboard.press('Escape');await expect(page.locator('#about')).toBeHidden();await expect(page.locator('#info-button')).toBeFocused();
});
test('single top notification region replaces messages without covering controls in either mode',async({page})=>{
  await openTracks(page);await page.locator('#expand-player').click();await page.locator('#repeat').click();await expect(page.locator('#toast')).toHaveText('تكرار المجموعة');await above(page);
  await page.locator('#repeat').click();await expect(page.locator('#toast')).toHaveText('تكرار المقطع');
  await expect(page.locator('#toast')).toBeEmpty({timeout:4000});
  await page.locator('#collapse-player').click();const idle=await page.locator('#player').evaluate(n=>n.getBoundingClientRect().height);
  for(const width of [320,375,390,430,768,1440]){
    await page.setViewportSize({width,height:844});await page.locator('.copy-link').first().click();await expect(page.locator('#toast')).toHaveText('نُسخ رابط المقطع');await above(page);
    await page.locator('#expand-player').click();await page.locator('#forward').click();await above(page);await page.locator('#collapse-player').click();
    expect(await page.locator('#player').evaluate(n=>n.getBoundingClientRect().height)).toBeLessThan(90);
  }
  await expect(page.locator('#site-toast')).toHaveCount(0);expect(idle).toBeLessThan(90);
});
test('optional feedback can be disabled while confirmations and errors remain visible',async({page})=>{
  await openTracks(page);await page.locator('#settings-button').click();await page.locator('#actionToasts').uncheck();await page.keyboard.press('Escape');
  await page.locator('#expand-player').click();await page.locator('#repeat').click();await expect(page.locator('#toast')).toBeEmpty();
  await page.locator('#player-track-actions .copy-link').click();await expect(page.locator('#toast')).toHaveText('نُسخ رابط المقطع');await above(page);
  await page.evaluate(async()=>{const {toast}=await import('./_player/notifications.js');toast('تعذّر تشغيل الصوت',{important:true});});
  await expect(page.locator('#toast')).toHaveAttribute('role','alert');await expect(page.locator('#toast')).toHaveText('تعذّر تشغيل الصوت');
});

test('all icon glyphs render locally with accessible controls and single press/active feedback',async({page})=>{
  await openTracks(page);await page.locator('#expand-player').click();
  const glyphs=await page.evaluate(async()=>{const {icon,paths}=await import('./_player/icons.js');const host=document.createElement('div');host.id='icon-test-host';host.innerHTML=Object.keys(paths).map(icon).join('');document.querySelector('#player').append(host);await document.fonts.ready;const result=[...host.querySelectorAll('svg')].map(n=>({name:n.dataset.uiIcon,width:n.getBBox().width,height:n.getBBox().height,viewBox:n.getAttribute('viewBox'),hidden:n.getAttribute('aria-hidden')}));host.remove();return result;});
  for(const g of glyphs){expect(g.width).toBeGreaterThan(0);expect(g.height).toBeGreaterThan(0);expect(g.viewBox).toBe('0 0 24 24');expect(g.hidden).toBe('true');}
  const labels=await page.locator('.icon-button:visible,.play-button:visible').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')));for(const label of labels)expect(label?.length).toBeGreaterThan(0);
  const button=page.locator('#shuffle');await button.scrollIntoViewIfNeeded();const box=await button.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
  await expect.poll(()=>button.evaluate(n=>getComputedStyle(n).transform)).not.toBe('none');await page.mouse.up();await expect(button).toHaveAttribute('aria-pressed','true');
  await expect.poll(()=>button.evaluate(n=>getComputedStyle(n).transform)).toBe('none');
  await page.locator('#repeat').click();await expect(page.locator('#repeat')).toHaveAttribute('aria-label','تكرار المجموعة');
  await page.emulateMedia({reducedMotion:'reduce'});await button.scrollIntoViewIfNeeded();const reducedBox=await button.boundingBox();await page.mouse.move(reducedBox.x+reducedBox.width/2,reducedBox.y+reducedBox.height/2);await page.mouse.down();expect(await button.evaluate(n=>getComputedStyle(n).transform)).toBe('none');await page.mouse.up();
  await page.keyboard.press('Tab');await page.locator('#next').focus();expect(await page.locator('#next').evaluate(n=>getComputedStyle(n).outlineStyle)).not.toBe('none');
});

test('About, footer and player feedback reflow across themes, fonts, numerals and screen widths',async({page})=>{
  test.setTimeout(60000); // Twelve preference combinations, six widths, and accessibility scans.
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await loaded(page);
  for(const font of ['heritage','system'])for(const theme of ['light','dark','auto'])for(const numerals of ['eastern','western']){
    await page.locator('#settings-button').click();await page.locator('#font-preference').selectOption(font);await page.locator('#theme-preference').selectOption(theme);await page.locator('#numeral-preference').selectOption(numerals);await page.keyboard.press('Escape');
    await page.locator('#info-button').click();
    for(const width of [320,375,390,430,768,1440]){
      await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      expect(await page.locator('#about').evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);
    }
    await page.keyboard.press('Escape');
  }
  await page.setViewportSize({width:390,height:844});await page.locator('#info-button').click();
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
  await page.keyboard.press('Escape');await openTracks(page);await page.locator('#expand-player').click();await page.locator('#repeat').click();await above(page);
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
  expect(errors).toEqual([]);
});

test.describe('touch feedback',()=>{
  test.use({hasTouch:true});
  test('a touch press does not move its control before release and playback runs once',async({page})=>{
    await loaded(page);await page.locator('.folder-card').first().click();await page.locator('#expand-player').click();
    await page.locator('.player-inner').evaluate(n=>Promise.all(n.getAnimations().map(animation=>animation.finished)));
    const before=await page.locator('#play').boundingBox();
    await page.locator('#play').dispatchEvent('pointerdown',{pointerType:'touch'});
    await expect(page.locator('#toast')).not.toHaveClass(/show/);
    expect((await page.locator('#play').boundingBox()).y).toBe(before.y);
    await page.touchscreen.tap(before.x+before.width/2,before.y+before.height/2);
    await expect.poll(()=>page.locator('#audio').evaluate(a=>!a.paused&&a.currentTime>0)).toBe(true);
    await above(page);
  });
});
