import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {readFileSync} from 'node:fs';
const manifest=JSON.parse(readFileSync(new URL('../../dist/_player/library.json',import.meta.url)));
const folder=manifest.folders.find(f=>f.name==='المعلقات');
const loaded=async page=>{await page.goto(`./#folder=${encodeURIComponent(folder.id)}`);await expect(page.locator('#play-folder')).toBeEnabled();};
const playing=async page=>expect.poll(()=>page.locator('#audio').evaluate(a=>!a.paused&&a.currentTime>0)).toBe(true);
const controller=async page=>page.evaluate(async()=>{const {createVolumeController}=await import('./_player/volume.js');window.testVolume=createVolumeController(document.querySelector('#audio'));});
const level=async(page,id,value)=>page.locator(`#${id}`).evaluate((n,value)=>{n.value=value;n.dispatchEvent(new Event('input',{bubbles:true}));},value);
const processed=async page=>expect.poll(()=>page.evaluate(()=>window.testVolume.mode)).toBe('processed');

test('ordinary slider has a unity midpoint, exists only in expanded mode, mutes and restores without autoplay',async({page})=>{
  await loaded(page);await controller(page);await expect(page.locator('#volume')).toBeHidden();
  expect(await page.evaluate(()=>window.testVolume.context)).toBeUndefined();
  await page.locator('#expand-player').click();await expect(page.locator('#volume')).toHaveValue('1');
  await expect(page.locator('#volume')).toHaveAttribute('min','0');await expect(page.locator('#volume')).toHaveAttribute('max','2');
  await expect(page.getByRole('slider',{name:'مستوى الصوت',exact:true})).toBeVisible();
  await page.locator('#volume').focus();await page.keyboard.press('ArrowRight');await processed(page);
  expect(await page.locator('#audio').evaluate(a=>a.paused&&!a.src)).toBe(true);
  await level(page,'volume',1.6);await page.locator('#mute').click();await expect(page.locator('#volume')).toHaveValue('0');
  await expect(page.locator('#mute')).toHaveAttribute('aria-label','تشغيل الصوت');
  await page.locator('#mute').click();await expect(page.locator('#volume')).toHaveValue('1.6');
  await page.locator('#collapse-player').click();await page.locator('#settings-button').click();
  await expect(page.locator('#settings-volume,#settings-mute')).toHaveCount(0);await page.keyboard.press('Escape');await page.locator('#expand-player').click();await level(page,'volume',0.5);
  await page.reload();await controller(page);expect(await page.evaluate(()=>window.testVolume.level)).toBe(0.5);
  expect(await page.locator('#audio').evaluate(a=>a.paused&&!a.src)).toBe(true);
});

// A test-only PCM source lets us measure the actual media-element output path.
function tone(){
  const rate=24000,frames=rate*10,buffer=Buffer.alloc(44+frames*2);
  buffer.write('RIFF');buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVEfmt ',8);buffer.writeUInt32LE(16,16);
  buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(rate,24);buffer.writeUInt32LE(rate*2,28);
  buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(frames*2,40);
  for(let i=0;i<frames;i++)buffer.writeInt16LE(Math.round(0.1*32767*Math.sin(i*2*Math.PI*400/rate)),44+i*2);
  return buffer;
}
test('real MediaElementAudioSource output doubles at maximum; one graph survives track and playback changes',async({page})=>{
  const m=structuredClone(manifest);for(const t of m.tracks.filter(t=>folder.tracks.slice(0,2).includes(t.id))){t.url='_player/volume-test.wav';t.mime='audio/wav';}
  const wav=tone();
  await page.route('**/_player/library.json',route=>route.fulfill({json:m}));
  await page.route('**/volume-test.wav',route=>{
    const range=route.request().headers().range;
    if(range){
      const match=/^bytes=(\d+)-(\d*)$/.exec(range);
      if(match){
        const start=Number(match[1]),end=Math.min(Number(match[2]||wav.length-1),wav.length-1);
        if(start<=end)return route.fulfill({status:206,headers:{'Content-Type':'audio/wav','Content-Range':`bytes ${start}-${end}/${wav.length}`,'Accept-Ranges':'bytes','Content-Length':String(end-start+1)},body:wav.subarray(start,end+1)});
      }
    }
    return route.fulfill({status:200,headers:{'Content-Type':'audio/wav','Accept-Ranges':'bytes','Content-Length':String(wav.length)},body:wav});
  });
  await loaded(page);await page.locator('#play-folder').click();await playing(page);await page.locator('#expand-player').click();
  await controller(page);await page.locator('#volume').click();await processed(page);
  await page.evaluate(()=>{const v=window.testVolume;window.testContext=v.context;window.testSource=v.source;window.testAnalyser=v.context.createAnalyser();window.testAnalyser.fftSize=2048;v.shaper.connect(window.testAnalyser);});
  const rms=async()=>page.evaluate(()=>{const data=new Float32Array(window.testAnalyser.fftSize);window.testAnalyser.getFloatTimeDomainData(data);return Math.sqrt(data.reduce((sum,x)=>sum+x*x,0)/data.length);});
  const settledRms=async()=>{
    const start=await page.evaluate(()=>window.testVolume.context.currentTime);
    // Cover the gain ramp and several complete analyser windows. A first buffer
    // may contain startup silence even after its RMS exceeds the lower bound.
    await expect.poll(()=>page.evaluate(()=>window.testVolume.context.currentTime)).toBeGreaterThan(start+0.15);
    return page.evaluate(async()=>{
      const values=[],data=new Float32Array(window.testAnalyser.fftSize);
      for(let i=0;i<7;i++){
        await new Promise(resolve=>setTimeout(resolve,16));window.testAnalyser.getFloatTimeDomainData(data);
        values.push(Math.sqrt(data.reduce((sum,x)=>sum+x*x,0)/data.length));
      }
      return values.sort((a,b)=>a-b)[3];
    });
  };
  await level(page,'volume',1);const normal=await settledRms();expect(normal).toBeGreaterThan(0.06);
  await level(page,'volume',2);const raised=await settledRms();expect(raised).toBeGreaterThan(0.13);
  expect(raised/normal).toBeGreaterThan(1.95);expect(raised/normal).toBeLessThan(2.05);
  expect(await page.locator('#audio').evaluate(a=>a.volume)).toBe(1);
  await expect.poll(()=>page.evaluate(()=>window.testVolume.gain.gain.value)).toBeCloseTo(2,3);
  await page.locator('#next').click();await playing(page);expect(await page.evaluate(()=>window.testVolume.source===window.testSource&&window.testVolume.context===window.testContext)).toBe(true);
  await page.locator('#progress').evaluate(n=>{n.value=3;n.dispatchEvent(new Event('input',{bubbles:true}));});await page.locator('#repeat').click();await page.locator('#shuffle').click();
  await page.locator('#mute').click();await expect.poll(rms).toBeLessThan(0.0001);await page.locator('#mute').click();await expect.poll(rms).toBeGreaterThan(0.13);
});

test('real offline rendering preserves normal audio and safely limits raised full-scale peaks',async({page})=>{
  await loaded(page);
  const result=await page.evaluate(async()=>{
    const {volumeCurve}=await import('./_player/volume.js');
    const render=async(amplitude,gainValue)=>{
      const context=new OfflineAudioContext(1,4096,48000),buffer=context.createBuffer(1,4096,48000);
      buffer.getChannelData(0).fill(amplitude);
      const source=context.createBufferSource(),gain=context.createGain(),headroom=context.createGain(),shaper=context.createWaveShaper();
      source.buffer=buffer;gain.gain.value=gainValue;headroom.gain.value=0.5;shaper.curve=volumeCurve(gainValue>1);
      source.connect(gain);gain.connect(headroom);headroom.connect(shaper);shaper.connect(context.destination);source.start();
      const output=(await context.startRendering()).getChannelData(0);return Math.max(...output.map(Math.abs));
    };
    return {normal:await render(0.99,1),quiet:await render(0.1,2),peak:await render(1,2)};
  });
  expect(result.normal).toBeCloseTo(0.99,5);expect(result.quiet).toBeCloseTo(0.2,5);expect(result.peak).toBeLessThanOrEqual(1);expect(result.peak).toBeGreaterThan(0.98);
});

test('saved selection initializes on a play gesture, persists across tracks/reload, and never changes mode preferences',async({page})=>{
  await page.addInitScript(()=>{if(!localStorage.getItem('media-player:/media/:v1'))localStorage.setItem('media-player:/media/:v1',JSON.stringify({audioLevel:{level:1.7,muted:true},speed:1.25,actionToasts:false,controlHints:false,shuffle:true,repeat:'track'}));});
  await loaded(page);await controller(page);expect(await page.evaluate(()=>window.testVolume.context)).toBeUndefined();
  await page.locator('#play-folder').click();await processed(page);await playing(page);
  await page.locator('#expand-player').click();await expect(page.locator('#volume')).toHaveValue('0');await page.locator('#mute').click();await expect(page.locator('#volume')).toHaveValue('1.7');
  await expect(page.locator('#toast')).not.toHaveClass(/show/);await page.locator('#next').click();await expect(page.locator('#volume')).toHaveValue('1.7');
  await page.reload();await controller(page);await page.locator('#expand-player').click();await expect(page.locator('#volume')).toHaveValue('1.7');
  expect(await page.locator('#audio').evaluate(a=>a.paused&&!a.src)).toBe(true);
  const prefs=await page.evaluate(()=>JSON.parse(localStorage.getItem('media-player:/media/:v1')));
  expect(prefs.actionToasts).toBe(false);expect(prefs.controlHints).toBe(false);expect(prefs.repeat).toBe('track');expect(prefs.shuffle).toBe(true);expect(prefs.speed).toBe(1.25);
});

for(const failure of ['missing','constructor','resume','timeout'])test(`native playback remains functional after AudioContext ${failure}`,async({page})=>{
  await page.addInitScript(failure=>{
    const Native=window.AudioContext;
    if(failure==='missing'){window.AudioContext=undefined;window.webkitAudioContext=undefined;return;}
    window.AudioContext=class extends Native {
      constructor(...args){if(failure==='constructor')throw Error('test unavailable');super(...args);}
      get state(){return failure==='resume'||failure==='timeout'?'suspended':super.state;}
      resume(){return failure==='resume'?Promise.reject(Error('test denied')):failure==='timeout'?new Promise(()=>{}):super.resume();}
    };
  },failure);
  await loaded(page);await page.locator('#play-folder').click();await playing(page);await page.locator('#expand-player').click();
  await controller(page);await page.locator('#volume').click();await expect.poll(()=>page.evaluate(()=>window.testVolume.mode)).toBe('fallback');
  await level(page,'volume',0.4);await expect.poll(()=>page.locator('#audio').evaluate(a=>a.volume)).toBeCloseTo(0.4);await expect(page.locator('#volume')).toBeEnabled();
  await expect(page.locator('#volume')).toHaveAttribute('max','1');await page.locator('#mute').click();await expect.poll(()=>page.locator('#audio').evaluate(a=>a.muted)).toBe(true);
  await page.locator('#mute').click();await playing(page);await page.locator('#next').click();await playing(page);
});

test('closed processing context recovers native playback, position, speed and app event listeners',async({page})=>{
  await loaded(page);await page.locator('#play-folder').click();await playing(page);await page.locator('#expand-player').click();await controller(page);
  await page.locator('#volume').click();await processed(page);await level(page,'volume',1.4);await page.locator('#speed').selectOption('1.25');
  await page.locator('#progress').evaluate(n=>{n.value=7;n.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.evaluate(async()=>{window.oldAudio=document.querySelector('#audio');await window.testVolume.context.close();});
  await expect.poll(()=>page.evaluate(()=>window.testVolume.mode)).toBe('fallback');await playing(page);
  expect(await page.evaluate(()=>document.querySelector('#audio')!==window.oldAudio)).toBe(true);
  await expect.poll(()=>page.locator('#audio').evaluate(a=>a.currentTime)).toBeGreaterThanOrEqual(6);
  expect(await page.locator('#audio').evaluate(a=>a.playbackRate)).toBe(1.25);
  const restored=await page.locator('#audio').evaluate(a=>a.currentTime);
  await expect.poll(()=>page.locator('#audio').evaluate(a=>a.currentTime)).toBeGreaterThan(restored+0.1);
  await page.locator('#next').click();await playing(page);await page.locator('#play').click();expect(await page.locator('#audio').evaluate(a=>a.paused)).toBe(true);
});

test('volume fits narrow phones, tablet and desktop, both themes and fonts, with no technical labels or input toasts',async({page})=>{
  await loaded(page);
  for(const font of ['heritage','system'])for(const theme of ['light','dark']){
    await page.locator('#settings-button').click();await page.locator('#font-preference').selectOption(font);await page.locator('#theme-preference').selectOption(theme);
    for(const width of [320,375,390,430,768,1440]){
      await page.setViewportSize({width,height:844});expect(await page.locator('#settings').evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);
    }
    await page.keyboard.press('Escape');await page.locator('#expand-player').click();
    for(const width of [320,375,390,430,768,1440]){
      await page.setViewportSize({width,height:844});
      expect(await page.locator('#player').evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);
      const rect=await page.locator('#volume').boundingBox();expect(rect.width).toBeGreaterThan(140);expect(rect.height).toBeGreaterThanOrEqual(44);
    }
    await expect(page.locator('#player .volume-control')).toHaveText('مستوى الصوت');
    await page.locator('#collapse-player').click();
  }
  await page.locator('#settings-button').click();await page.locator('#actionToasts').uncheck();await page.keyboard.press('Escape');
  await page.locator('#expand-player').click();await page.locator('#volume').focus();
  await page.keyboard.press('End');await page.keyboard.press('Home');
  expect(await page.locator('#volume').getAttribute('aria-valuetext')).toBe('صامت');
  await page.keyboard.press('Escape');await expect(page.locator('#toast')).not.toHaveClass(/show/);
  await page.locator('#settings-button').click();
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
});

test.describe('existing offline store',()=>{
  test.use({serviceWorkers:'allow'});
  test('saved audio still plays and seeks offline through the gain graph after shell upgrade',async({page,context})=>{
    await loaded(page);await page.evaluate(()=>navigator.serviceWorker.ready);await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
    await page.reload();await expect(page.locator('#play-folder')).toBeEnabled();
    await page.locator('#play-folder').click();await playing(page);await page.locator('#expand-player').click();await expect(page.locator('#now-cache')).toHaveText('محفوظ دون إنترنت',{timeout:20000});
    await page.locator('#volume').click();await level(page,'volume',1.4);
    // Release the long-lived media response before asserting worker activation.
    // Chromium may leave an update waiting while an old worker still serves that response.
    await page.reload();await expect(page.locator('#play-folder')).toBeEnabled();
    await page.evaluate(async()=>{await(await caches.open('media-player:/media/:old-volume-test')).put('/media/old',new Response('old'));await navigator.serviceWorker.register('/media/sw.js?volume-upgrade',{scope:'/media/'});});
    await expect.poll(()=>page.evaluate(()=>navigator.serviceWorker.controller?.scriptURL)).toContain('volume-upgrade');
    await expect.poll(()=>page.evaluate(async()=>!(await caches.keys()).includes('media-player:/media/:old-volume-test'))).toBe(true);
    await context.setOffline(true);await page.reload();await expect(page.locator('#play')).toBeEnabled();await page.locator('#play').click();await playing(page);await controller(page);await processed(page);
    await page.locator('#progress').evaluate(n=>{n.value=8;n.dispatchEvent(new Event('input',{bubbles:true}));});
    await expect.poll(()=>page.locator('#audio').evaluate(a=>a.currentTime)).toBeGreaterThanOrEqual(7);
    const bytes=await page.evaluate(async()=>{const r=await fetch(document.querySelector('#audio').src,{headers:{Range:'bytes=0-1'}});return {status:r.status,length:(await r.arrayBuffer()).byteLength};});
    expect(bytes).toEqual({status:206,length:2});await context.setOffline(false);
  });
});

test('suspended contexts recover once, while paused foreground events never restart playback',async({page})=>{
  await loaded(page);await page.locator('#play-folder').click();await playing(page);await page.locator('#expand-player').click();await controller(page);await page.locator('#volume').click();await processed(page);
  await page.evaluate(async()=>{window.originalVolumeSource=window.testVolume.source;await window.testVolume.context.suspend();});
  await expect.poll(()=>page.evaluate(()=>window.testVolume.context.state)).toBe('running');
  expect(await page.evaluate(()=>window.testVolume.source===window.originalVolumeSource)).toBe(true);await playing(page);
  await page.locator('#play').click();await page.evaluate(async()=>{await window.testVolume.context.suspend();window.dispatchEvent(new Event('pageshow'));document.dispatchEvent(new Event('visibilitychange'));});
  expect(await page.locator('#audio').evaluate(a=>a.paused)).toBe(true);expect(await page.evaluate(()=>window.testVolume.context.state)).toBe('suspended');
  await page.locator('#play').click();await playing(page);await expect.poll(()=>page.evaluate(()=>window.testVolume.context.state)).toBe('running');
});

test.describe('touch activation',()=>{
  test.use({hasTouch:true});
  test('touch release retries stalled resume in the gesture and retains one media source',async({page})=>{
    await page.addInitScript(()=>{
      const Native=window.AudioContext || window.webkitAudioContext;
      window.AudioContext=class extends Native {
        constructor(...args){super(...args);this.attempts=0;this.sourceCount=0;}
        get state(){return this.attempts<2?'suspended':super.state;}
        resume(){this.attempts++;if(this.attempts===1)return new Promise(()=>{});return super.resume();}
        createMediaElementSource(element){this.sourceCount++;return super.createMediaElementSource(element);}
      };
    });
    await loaded(page);await controller(page);await page.locator('#expand-player').click();
    await page.locator('#volume').scrollIntoViewIfNeeded();const box=await page.locator('#volume').boundingBox();
    await page.touchscreen.tap(box.x+box.width*.85,box.y+box.height/2);await processed(page);
    const result=await page.evaluate(()=>({attempts:window.testVolume.context.attempts,sources:window.testVolume.context.sourceCount}));
    expect(result.attempts).toBeGreaterThanOrEqual(2);expect(result.sources).toBe(1);
  });
});

test.describe('first touch volume drag',()=>{
  test.use({hasTouch:true});
  test('drag input stays native until release so a held touch cannot exhaust activation recovery',async({page})=>{
    await loaded(page);await controller(page);await page.locator('#expand-player').click();
    await page.locator('#volume').dispatchEvent('pointerdown',{pointerType:'touch'});
    await level(page,'volume',1.8);
    expect(await page.evaluate(()=>window.testVolume.context)).toBeUndefined();
    expect(await page.evaluate(()=>window.testVolume.level)).toBe(1.8);
    await page.locator('#volume').scrollIntoViewIfNeeded();const box=await page.locator('#volume').boundingBox();
    await page.touchscreen.tap(box.x+box.width*.85,box.y+box.height/2);await processed(page);
  });
});

test('native fallback restores position when replacement metadata has a transient zero duration',async({page})=>{
  await loaded(page);await page.locator('#play-folder').click();await playing(page);await page.locator('#expand-player').click();await controller(page);await page.locator('#volume').click();await processed(page);
  await page.locator('#progress').evaluate(n=>{n.value=7;n.dispatchEvent(new Event('input',{bubbles:true}));});
  await expect.poll(()=>page.locator('#audio').evaluate(a=>a.currentTime)).toBeGreaterThanOrEqual(6);
  await page.evaluate(async()=>{
    const v=window.testVolume,replace=v.onReplace;
    v.onReplace=(next,previous)=>{
      Object.defineProperty(next,'duration',{get:()=>0,configurable:true});
      // Reproduce ready events arriving without a useful durationchange/timeupdate.
      for(const name of ['durationchange','timeupdate']) next.addEventListener(name,event=>event.stopImmediatePropagation());
      replace(next,previous);
    };
    await v.context.close();
  });
  await expect.poll(()=>page.evaluate(()=>window.testVolume.mode)).toBe('fallback');
  await expect.poll(()=>page.locator('#audio').evaluate(a=>a.readyState)).toBeGreaterThanOrEqual(2);
  await page.locator('#audio').evaluate(a=>{a.pause();delete a.duration;a.dispatchEvent(new Event('canplay'));});
  await expect.poll(()=>page.locator('#audio').evaluate(a=>a.currentTime)).toBeGreaterThanOrEqual(6);
});

test('native volume readback during a mute press preserves its pointer target',async({page})=>{
  await page.addInitScript(()=>{window.AudioContext=undefined;window.webkitAudioContext=undefined;});
  await loaded(page);await page.locator('#play-folder').click();await playing(page);
  await page.locator('#expand-player').click();await controller(page);await level(page,'volume',.4);
  await expect.poll(()=>page.locator('#audio').evaluate(a=>a.volume)).toBeCloseTo(.4);
  const point=await page.locator('#mute svg').evaluate(svg=>{
    const r=svg.getBoundingClientRect();
    for(let x=r.left+1;x<r.right;x++)for(let y=r.top+1;y<r.bottom;y++){
      const hit=document.elementFromPoint(x,y);if(hit&&svg.contains(hit))return {x,y};
    }
    throw Error('No icon hit target');
  });
  await page.mouse.move(point.x,point.y);await page.mouse.down();
  // Deliver the delayed native acknowledgement while the icon is pressed.
  await page.evaluate(()=>{window.testVolume.nativeAdjustable=false;document.querySelector('#audio').dispatchEvent(new Event('volumechange'));});
  await page.mouse.up();await expect.poll(()=>page.locator('#audio').evaluate(a=>a.muted)).toBe(true);
  await expect(page.locator('#mute')).toHaveAttribute('aria-pressed','true');
});

test('late native volume readback leaves a writable fallback slider usable',async({page})=>{
  await page.addInitScript(()=>{window.AudioContext=undefined;window.webkitAudioContext=undefined;});
  await loaded(page);await page.locator('#play-folder').click();await playing(page);
  await page.locator('#expand-player').click();await controller(page);
  await page.locator('#audio').evaluate(a=>{a.volume=.4;a.dispatchEvent(new Event('volumechange'));});
  await expect(page.locator('#volume')).toBeEnabled();
  await level(page,'volume',.6);await expect.poll(()=>page.locator('#audio').evaluate(a=>a.volume)).toBeCloseTo(.6);
});

test('replacement audio never reapplies stale native time over a pending seek',async({page})=>{
  await page.addInitScript(()=>{
    window.restorationWrites=[];
    const descriptor=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'currentTime');
    Object.defineProperty(HTMLMediaElement.prototype,'currentTime',{...descriptor,set(value){
      if(this.id==='audio'&&window.oldAudio&&this!==window.oldAudio)window.restorationWrites.push(value);
      descriptor.set.call(this,value);
    }});
  });
  await loaded(page);await page.locator('#play-folder').click();await playing(page);
  await page.locator('#expand-player').click();await controller(page);await page.locator('#volume').click();await processed(page);
  await page.evaluate(async()=>{
    const progress=document.querySelector('#progress');progress.value=7;progress.dispatchEvent(new Event('input',{bubbles:true}));
    window.oldAudio=document.querySelector('#audio');
    Object.defineProperty(window.oldAudio,'currentTime',{get:()=>.05,configurable:true});
    await window.testVolume.context.close();
  });
  await expect.poll(()=>page.evaluate(()=>window.restorationWrites.length)).toBeGreaterThan(0);
  expect(await page.evaluate(()=>window.restorationWrites)).not.toContain(.05);
  await expect.poll(()=>page.locator('#audio').evaluate(a=>a.currentTime)).toBeGreaterThanOrEqual(6);
  const position=await page.locator('#audio').evaluate(a=>a.currentTime);
  await expect.poll(()=>page.locator('#audio').evaluate(a=>a.currentTime)).toBeGreaterThan(position+.1);
});

test.afterEach(async({page},info)=>{
  if(info.status===info.expectedStatus)return;
  const state=await page.evaluate(()=>{
    const a=document.querySelector('#audio'),v=window.testVolume;
    return {audio:a&&{volume:a.volume,muted:a.muted,paused:a.paused,readyState:a.readyState,seeking:a.seeking,time:a.currentTime,duration:a.duration},controller:v&&{mode:v.mode,level:v.level,muted:v.muted,nativeAdjustable:v.nativeAdjustable},sliderDisabled:document.querySelector('#volume')?.disabled};
  });
  await info.attach('volume-state',{body:JSON.stringify(state),contentType:'application/json'});
});
