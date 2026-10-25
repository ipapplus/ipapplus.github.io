import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const manifest=JSON.parse(readFileSync(new URL('../../dist/_player/library.json',import.meta.url)));
const folder=manifest.folders.find(f=>f.tracks.length>=3);
const start=async page=>{
  await page.goto(`./#folder=${encodeURIComponent(folder.id)}`);
  await page.locator('#play-folder').click();
  await expect.poll(()=>page.locator('#audio').evaluate(a=>!a.paused&&a.currentTime>0)).toBe(true);
};
const geometry=page=>page.evaluate(()=>['.topbar','.header-inner','#folder-heading','#player','.player-content','#volume'].map(s=>{
  const r=document.querySelector(s).getBoundingClientRect();return [r.x,r.y,r.width,r.height];
}));
const assertLayout=async(page,width,height)=>{
  const result=await page.locator('#player').evaluate(p=>{
    const bounds=p.getBoundingClientRect();
    const ids=['cover','now-title','now-narrator','now-folder','now-cache','progress','position','duration','previous','rewind','play','forward','next','shuffle','repeat','speed','volume','mute'];
    const nodes=ids.map(id=>document.getElementById(id)).filter(n=>!n.hidden);nodes.push(...p.querySelectorAll('.copy-link,.download-audio:not([hidden])'));
    return {overflow:p.scrollHeight>p.clientHeight+1||p.querySelector('.player-content').scrollHeight>p.querySelector('.player-content').clientHeight+1,
      scrollBounds:[p,p.querySelector('.player-content')].map(n=>({class:n.className,scrollHeight:n.scrollHeight,clientHeight:n.clientHeight})),
      outside:nodes.filter(n=>{const r=n.getBoundingClientRect();return r.width===0||r.height===0||r.top<Math.max(0,bounds.top)-1||r.bottom>Math.min(innerHeight,bounds.bottom)+1||r.left<0||r.right>innerWidth+1;}).map(n=>n.id||n.className),
      targets:nodes.filter(n=>n.matches('button,input,select,a')).map(n=>Math.min(n.getBoundingClientRect().height,n.getBoundingClientRect().width))};
  });
  expect(result.outside,`${width}×${height}`).toEqual([]);expect(result.overflow,`${width}×${height}: ${JSON.stringify(result.scrollBounds)}`).toBe(false);
  for(const size of result.targets)expect(Math.round(size*100)/100).toBeGreaterThanOrEqual(44);
};
test('toasts overlay folders and expanded player without changing geometry',async({page})=>{
  await start(page);
  for(const expanded of [false,true]){
    if(expanded)await page.locator('#expand-player').click();
    await page.locator('.player-inner').evaluate(async n=>{
      await document.fonts.ready;
      await Promise.all(n.getAnimations().map(animation=>animation.finished));
    });
    const before=await geometry(page);
    await page.evaluate(async()=>{(await import('./_player/notifications.js')).toast('نُسخ رابط المقطع');});
    await expect(page.locator('#toast')).toBeVisible();
    expect(await geometry(page)).toEqual(before);
    expect(await page.locator('#toast').evaluate(n=>getComputedStyle(n).position)).toBe('fixed');
    await page.evaluate(async()=>{(await import('./_player/notifications.js')).dismissToast();});
    await expect(page.locator('#toast')).toBeEmpty();expect(await geometry(page)).toEqual(before);
  }
});
test('essential expanded controls fit short, tall and landscape viewports without scrolling',async({page})=>{
  await start(page);await page.locator('#expand-player').click();
  for(const [width,height] of [[320,568],[375,667],[390,664],[390,844],[430,932],[768,1024],[1440,900],[480,320],[568,320],[667,320],[844,256],[844,390],[1440,420]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(250);
    await assertLayout(page,width,height);
  }
});
test('expanded reveal keeps compact controls inside their scroll bounds throughout the animation',async({page})=>{
  await page.setViewportSize({width:320,height:568});
  await start(page);
  // Start and freeze in one task so remote-runner latency cannot finish the animation.
  await page.locator('#expand-player').evaluate(button=>{
    button.click();
    window.reveal=document.querySelector('.player-inner').getAnimations().find(a=>a.animationName==='sheet-reveal');
    if(!window.reveal)throw Error('Expected the expanded reveal animation');
    window.reveal.pause();
  });
  for(const time of [0,50,100,199,200]){
    await page.evaluate(time=>{window.reveal.currentTime=time;},time);
    await assertLayout(page,320,568);
  }
});
test('global shuffle toggles and preserves queue and mode through minimize',async({page})=>{
  await page.goto('./');await page.locator('#play-random').click();await page.locator('#expand-player').click();
  const shuffle=page.locator('#shuffle');await expect(shuffle).toBeEnabled();await expect(shuffle).toHaveAttribute('aria-pressed','true');
  const src=await page.locator('#audio').getAttribute('src');
  await shuffle.click();await expect(shuffle).toHaveAttribute('aria-pressed','false');
  await shuffle.click();await expect(shuffle).toHaveAttribute('aria-pressed','true');
  await page.locator('#next').click();await expect.poll(()=>page.locator('#audio').getAttribute('src')).not.toBe(src);
  const next=await page.locator('#audio').getAttribute('src');
  await page.locator('#previous').click();await expect.poll(()=>page.locator('#audio').getAttribute('src')).toBe(src);
  await page.locator('#collapse-player').click();await page.locator('.now-copy').click();
  await expect(page.locator('#player')).toHaveClass(/expanded/);await expect(shuffle).toHaveAttribute('aria-pressed','true');
  await page.locator('#now-folder').click();await expect(page.locator('#player')).not.toHaveClass(/expanded/);
  await page.locator('#next').click();await expect.poll(()=>page.locator('#audio').getAttribute('src')).toBe(next);
});
test('legacy viewport fallback ignores stale visualViewport dimensions during window resize',async({page})=>{
  await page.addInitScript(()=>{
    const supports=CSS.supports.bind(CSS);
    CSS.supports=(...args)=>args[0]==='height'&&args[1]==='100dvh'?false:supports(...args);
  });
  await start(page);await page.locator('#expand-player').click();
  await page.evaluate(()=>{
    Object.defineProperty(visualViewport,'height',{get:()=>900,configurable:true});
    dispatchEvent(new Event('resize'));
  });
  expect(await page.locator('#player').evaluate(n=>n.getBoundingClientRect().height)).toBe(await page.evaluate(()=>innerHeight));
});
const swipe=async(page,selector,dx=0,dy=150,cancel=false)=>page.locator(selector).evaluate((n,{dx,dy,cancel})=>{
  const r=n.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
  for(const [type,mx,my] of [['pointerdown',0,0],['pointermove',dx,dy],[cancel?'pointercancel':'pointerup',dx,dy]])n.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:7,pointerType:'touch',isPrimary:true,clientX:x+mx,clientY:y+my}));
},{dx,dy,cancel});
test('downward swipe minimizes, interactive and horizontal gestures preserve playback',async({page})=>{
  await start(page);await page.evaluate(()=>scrollTo({top:200,behavior:'instant'}));const scroll=await page.evaluate(()=>scrollY);
  await page.locator('.now-copy').click();await expect(page.locator('#player')).toHaveClass(/expanded/);
  await page.locator('#speed').selectOption('1.25');
  await page.locator('#volume').evaluate(n=>{n.value='.64';n.dispatchEvent(new Event('input',{bubbles:true}));});
  expect(await page.locator('.workspace').evaluate(n=>n.inert)).toBe(true);
  expect(await page.locator('body').evaluate(n=>getComputedStyle(n).position)).toBe('fixed');
  const state=await page.locator('#audio').evaluate(a=>({src:a.src,time:a.currentTime,rate:a.playbackRate}));
  await swipe(page,'#volume');await expect(page.locator('#player')).toHaveClass(/expanded/);
  await swipe(page,'#progress');await swipe(page,'#play');await swipe(page,'#cover',150,30);await swipe(page,'#cover',0,150,true);
  await expect(page.locator('#player')).toHaveClass(/expanded/);
  await swipe(page,'#cover');await expect(page.locator('#player')).not.toHaveClass(/expanded/);
  expect(await page.evaluate(()=>scrollY)).toBe(scroll);
  const after=await page.locator('#audio').evaluate(a=>({src:a.src,time:a.currentTime,rate:a.playbackRate,paused:a.paused}));
  await expect(page.locator('#volume')).toHaveValue('0.64');
  expect(after.src).toBe(state.src);expect(after.rate).toBe(state.rate);expect(after.time).toBeGreaterThanOrEqual(state.time);expect(after.paused).toBe(false);
  expect(await page.locator('.workspace').evaluate(n=>n.inert)).toBe(false);
});
test('folder action minimizes and navigates once without replacing playback or queue',async({page})=>{
  await start(page);await page.locator('#brand').click();await expect(page.locator('#hero')).toBeVisible();
  await page.locator('#expand-player').click();const src=await page.locator('#audio').getAttribute('src');
  await page.evaluate(()=>{window.trackRenders=0;new MutationObserver(()=>window.trackRenders++).observe(document.querySelector('#tracks'),{childList:true});});
  const length=await page.evaluate(()=>history.length);await page.locator('#now-folder').click();
  await expect(page.locator('#player')).not.toHaveClass(/expanded/);await expect(page.locator('#folder-heading')).toBeInViewport();
  expect(await page.evaluate(()=>history.length)).toBe(length+1);expect(await page.locator('#audio').getAttribute('src')).toBe(src);
  expect(await page.evaluate(()=>window.trackRenders)).toBe(1);
  await page.locator('#expand-player').click();await page.locator('#now-folder').click();expect(await page.evaluate(()=>history.length)).toBe(length+1);
  await page.goBack();await expect(page.locator('#hero')).toBeVisible();expect(await page.locator('#audio').getAttribute('src')).toBe(src);
});

test('safe-area standalone layout keeps volume visible with all font, numeral and theme preferences',async({page})=>{
  test.setTimeout(60000);
  // Headless engines report zero safe areas. Substitute real inset dimensions in the stylesheet only.
  await page.route('**/_player/style.css',async route=>{
    const response=await route.fetch();const body=(await response.text()).replaceAll('env(safe-area-inset-top)','var(--test-safe-top,59px)').replaceAll('env(safe-area-inset-bottom)','var(--test-safe-bottom,34px)').replaceAll('env(safe-area-inset-left)','var(--test-safe-side,0px)').replaceAll('env(safe-area-inset-right)','var(--test-safe-side,0px)');
    await route.fulfill({response,body});
  });
  await page.addInitScript(()=>Object.defineProperty(navigator,'standalone',{value:true,configurable:true}));
  await start(page);await page.locator('#expand-player').click();
  for(const font of ['heritage','system'])for(const numerals of ['eastern','western'])for(const theme of ['light','dark','auto']){
    await page.evaluate(({font,numerals,theme})=>{
      document.documentElement.dataset.font=font;window.DiwanTheme.set(theme);
      document.querySelector('#numeral-preference').value=numerals;document.querySelector('#numeral-preference').dispatchEvent(new Event('change'));
    },{font,numerals,theme});
    for(const [width,height] of [[320,568],[375,667],[390,664],[430,740],[768,700],[667,320],[844,256]]){
      await page.setViewportSize({width,height});
      await page.evaluate(landscape=>{
        document.documentElement.style.setProperty('--test-safe-top',landscape?'0px':'59px');
        document.documentElement.style.setProperty('--test-safe-bottom',landscape?'21px':'34px');
        document.documentElement.style.setProperty('--test-safe-side',landscape?'44px':'0px');
      },width>height);
      await page.waitForTimeout(250);await assertLayout(page,width,height);
    }
  }
  await expect(page.locator('#player-track-actions .download-audio')).toBeHidden();
  await page.emulateMedia({colorScheme:'dark'});await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  expect(await page.locator('html').evaluate(n=>getComputedStyle(n).colorScheme)).toBe('dark');
});

test('trusted touch drag minimizes the sheet and native volume dragging stays interactive',async({page,browserName})=>{
  test.skip(browserName!=='chromium','Trusted touch injection uses the Chromium debugging protocol; other engines exercise pointer handlers.');
  await page.setViewportSize({width:390,height:844});await start(page);await page.locator('#expand-player').click();
  const session=await page.context().newCDPSession(page);
  await session.send('Emulation.setTouchEmulationEnabled',{enabled:true});
  const drag=async(selector,dx,dy)=>{
    const r=await page.locator(selector).boundingBox(),x=r.x+r.width/2,y=r.y+r.height/2;
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    for(const t of [.2,.5,1])await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*t,y:y+dy*t}]});
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  };
  await drag('#volume',50,0);await expect(page.locator('#player')).toHaveClass(/expanded/);
  expect(Number(await page.locator('#volume').inputValue())).toBeGreaterThan(1);
  await drag('#cover',0,170);await expect(page.locator('#player')).not.toHaveClass(/expanded/);
  await expect.poll(()=>page.locator('#audio').evaluate(a=>!a.paused&&a.currentTime>0)).toBe(true);
});
test('track text, saved states and controls retain contrast across themes and interactions',async({page})=>{
  await start(page);
  for(const theme of ['dark','light']){
    await page.evaluate(theme=>window.DiwanTheme.set(theme),theme);
    for(const selector of ['.track-row.is-current','.track-row:not(.is-current)']){
      const row=page.locator(selector).first();
      for(const interaction of ['normal','hover','focus','pressed']){
        if(interaction==='hover')await row.hover();
        if(interaction==='focus')await row.locator('.track-play').focus();
        if(interaction==='pressed'){await row.locator('.track-play').hover();await page.mouse.down();}
        const colors=await row.evaluate(n=>{
          const rgba=c=>{const parts=c.match(/[\d.]+/g).map(Number);return [parts[0],parts[1],parts[2],parts[3]??1];};
          const blend=(front,back)=>front.slice(0,3).map((v,i)=>v*front[3]+back[i]*(1-front[3]));
          const lum=c=>c.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
          return [...n.querySelectorAll('.track-name,.track-path,.track-action,.save-track,.row-action,.cache-indicator,.download-size')].filter(el=>el.getBoundingClientRect().height>0).map(el=>{
            const ancestors=[];for(let parent=el;parent;parent=parent.parentElement)ancestors.unshift(parent);
            const background=ancestors.reduce((color,parent)=>blend(rgba(getComputedStyle(parent).backgroundColor),color),[255,255,255]);
            const opacity=ancestors.reduce((value,parent)=>value*Number(getComputedStyle(parent).opacity),1);
            const foreground=rgba(getComputedStyle(el).color);foreground[3]*=opacity;
            const back=lum(background),front=lum(blend(foreground,background));
            return {class:el.className,ratio:(Math.max(back,front)+.05)/(Math.min(back,front)+.05)};
          });
        });
        for(const item of colors)expect(item.ratio,`${theme} ${selector} ${interaction} ${item.class}`).toBeGreaterThanOrEqual(4.5);
        // Release away from the button to avoid changing the selected track.
        if(interaction==='pressed'){await page.mouse.move(0,0);await page.mouse.up();}
      }
    }
    await page.locator('#play').click();await expect(page.locator('.track-row.is-current')).toBeVisible();
  }
});
