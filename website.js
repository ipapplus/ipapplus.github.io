(function(){
  'use strict';
  if(window.RepoUI)return;
  function relativeTime(date,now=Date.now()){
    if(!Number.isFinite(date.getTime())||!Number.isFinite(now))return '';
    const seconds=Math.max(0,Math.floor((now-date.getTime())/1000));
    if(seconds<60)return 'Just now';
    const unit=seconds>=86400?'day':seconds>=3600?'hour':'minute';
    const count=Math.floor(seconds/(unit==='day'?86400:unit==='hour'?3600:60));
    return count+' '+unit+(count===1?'':'s')+' ago';
  }
  function additionTime(date,now=Date.now()){
    if(!Number.isFinite(date.getTime())||!Number.isFinite(now))return '';
    const minutes=Math.max(1,Math.floor((now-date.getTime())/60000));
    return minutes>=1440?Math.floor(minutes/1440)+'d ago':minutes>=60?Math.floor(minutes/60)+'h ago':minutes+'m ago';
  }
  let additions;
  function loadAdditions(force=false){
    if(force)additions=null;
    if(!additions)additions=fetch('latest-additions.json',{cache:'no-cache'}).then(response=>{
      if(!response.ok)throw new Error('Additions request failed');
      return response.json();
    }).then(entries=>{
      if(!Array.isArray(entries)||entries.some(entry=>!entry||!entry.package||!entry.version||!entry.addedAt||!Number.isFinite(Date.parse(entry.addedAt))))throw new Error('Invalid additions JSON');
      return entries.sort((a,b)=>Date.parse(b.addedAt)-Date.parse(a.addedAt));
    }).catch(error=>{additions=null;throw error;});
    return additions;
  }
  function trackModified(element,header,label){
    const date=header?new Date(header):null;
    if(!date||Number.isNaN(date.getTime()))return;
    element.title=date.toLocaleString('en-US');
    function refresh(){element.textContent=label+': '+relativeTime(date);}
    refresh();
    clearInterval(element.modifiedTimer);
    if(element.modifiedListener)document.removeEventListener('visibilitychange',element.modifiedListener);
    element.modifiedTimer=setInterval(refresh,60000);
    element.modifiedListener=()=>{if(!document.hidden)refresh();};
    document.addEventListener('visibilitychange',element.modifiedListener);
  }
  function toast(message){
    const element=document.getElementById('toast');
    if(!element)return;
    element.textContent=message;
    element.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer=setTimeout(()=>element.classList.remove('show'),2200);
  }
  async function copyText(value){
    if(navigator.clipboard&&window.isSecureContext){
      try{await navigator.clipboard.writeText(value);return;}catch(error){/* Use the selection fallback if clipboard access is denied. */}
    }
    const previous=document.activeElement;
    const area=document.createElement('textarea');
    area.value=value;area.setAttribute('readonly','');
    area.style.cssText='position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px';
    document.body.appendChild(area);
    area.focus({preventScroll:true});area.select();area.setSelectionRange(0,value.length);
    try{if(!document.execCommand('copy'))throw new Error('Copy failed');}
    finally{area.remove();if(previous&&previous.isConnected)previous.focus({preventScroll:true});}
  }
  // Delegation covers dynamically inserted cards and menu items on iOS Safari.
  let pressed=null,pressPointer=null,pressX=0,pressY=0;
  function releasePress(){
    if(pressed)pressed.classList.remove('is-pressed');
    pressed=null;pressPointer=null;
  }
  document.addEventListener('pointerdown',event=>{
    if(!event.isPrimary||event.button!==0)return;
    releasePress();
    const target=event.target.closest('button,a,.package-entry');
    if(!target||target.disabled||target.getAttribute('aria-disabled')==='true')return;
    pressed=target;pressPointer=event.pointerId;pressX=event.clientX;pressY=event.clientY;
    pressed.classList.add('is-pressed');
  },{passive:true});
  document.addEventListener('pointermove',event=>{
    if(event.pointerId===pressPointer&&Math.hypot(event.clientX-pressX,event.clientY-pressY)>10)releasePress();
  },{passive:true});
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>document.addEventListener(type,releasePress,{passive:true}));
  window.addEventListener('blur',releasePress);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)releasePress();});
  const versionKey=(packageId,version)=>JSON.stringify([packageId,version]);
  window.RepoUI={versionKey,relativeTime,additionTime,loadAdditions,trackModified,toast,copyText};
  // Delegation also covers the other view's lazily inserted Refresh button.
  document.addEventListener('click',event=>{
    const control=event.target.closest('[data-page-refresh]');
    if(!control||control.disabled)return;
    control.classList.add('is-refreshing');control.setAttribute('aria-busy','true');
    window.location.reload();
  });
  window.addEventListener('pageshow',()=>{
    document.querySelectorAll('[data-page-refresh]').forEach(control=>{
      control.classList.remove('is-refreshing');control.removeAttribute('aria-busy');
    });
  });
  // Shared features initialize once, including if this script is loaded twice.
  if(document.getElementById('adhkar-background'))return;
  const canvas=document.createElement('canvas');
  canvas.id='adhkar-background';canvas.setAttribute('aria-hidden','true');
  canvas.lang='ar';canvas.dir='rtl';document.body.prepend(canvas);
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const ctx=canvas.getContext('2d');
  const adhkar=[
    'سُبْحَانَ اللَّهِ',
    'الْحَمْدُ لِلَّهِ',
    'اللَّهُ أَكْبَرُ',
    'أَسْتَغْفِرُ اللَّهَ',
    'لَا إِلَٰهَ إِلَّا اللَّهُ',
    'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
    'سُبْحَانَ اللَّهِ الْعَظِيمِ',
    'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
    'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ',
    'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ',
    'اللَّهُمَّ صَلِّ عَلَى نَبِيِّنَا مُحَمَّدٍ',
    'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ',
    'رَبِّ اغْفِرْ لِي',
    'رَبِّ زِدْنِي عِلْمًا',
    'اللَّهُمَّ اغْفِرْ لِي وَارْحَمْنِي',
    'اللَّهُمَّ اهْدِنِي وَسَدِّدْنِي',
    'رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي',
    'لَا إِلَٰهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ',
    'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْهُدَى وَالتُّقَى وَالْعَفَافَ وَالْغِنَى',
    'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ',
    'اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي',
    'يَا مُقَلِّبَ الْقُلُوبِ ثَبِّتْ قَلْبِي عَلَى دِينِكَ',
    'اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ',
    'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْجَنَّةَ وَأَعُوذُ بِكَ مِنَ النَّارِ',
    'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ'
  ];
  if(ctx){
    let width=0,height=0,phrases=[],sprites=[],frame=0,last=0,next=0,lastShown=-1;
    let bag=[],insets={top:24,right:12,bottom:100,left:12};
    function refill(){
      bag=sprites.slice();
      for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
      if(bag[bag.length-1].index===lastShown)[bag[0],bag[bag.length-1]]=[bag[bag.length-1],bag[0]];
    }
    let exclusions=[],viewportX=0,viewportY=0,fontReady=false;
    const margin=12;
    function measure(){
      const main=document.querySelector('main:not([hidden])');
      if(!main){exclusions=[];return;}
      // The complete list is a conservative exclusion: no text in card gaps
      // can be overtaken by loading, filtering or accordion expansion.
      const elements=main.matches('.profile')?[main]:[...main.children].filter(el=>el.id!=='top-sentinel');
      elements.push(...document.querySelectorAll('#quran-radio-button,#back-to-top,#back-home,#build-menu,.toast.show,.skip-link:focus'));
      const home=main.matches('.profile');
      exclusions=elements.filter(el=>!el.hidden&&getComputedStyle(el).visibility!=='hidden').map(el=>{
        const r=el.getBoundingClientRect();
        return {left:home&&el===main?0:r.left-viewportX-margin,right:home&&el===main?width:r.right-viewportX+margin,
          top:r.top-viewportY-margin,bottom:r.bottom-viewportY+margin};
      }).filter(r=>r.right>0&&r.left<width&&r.bottom>0&&r.top<height);
    }
    function fits(sprite,x,y,others=[]){
      const r={left:x,right:x+sprite.width,top:y,bottom:y+sprite.height};
      return r.left>=insets.left&&r.right<=width-insets.right&&r.top>=insets.top&&r.bottom<=height-insets.bottom&&
        !exclusions.some(e=>r.left<e.right&&r.right>e.left&&r.top<e.bottom&&r.bottom>e.top)&&
        !others.some(p=>r.left<p.x+p.sprite.width+margin&&r.right>p.x-margin&&r.top<p.y+p.sprite.height+margin&&r.bottom>p.y-margin);
    }
    function place(sprite){
      // Partition the current viewport at obstacle edges. Every candidate is
      // tested with the entire padded sprite; insufficient space skips spawn.
      const xs=[insets.left,...exclusions.map(r=>r.right)];
      const ys=[insets.top,...exclusions.map(r=>r.bottom)];
      const candidates=[];
      for(const x of xs)for(const y of ys)if(fits(sprite,x,y,phrases))candidates.push({x,y});
      if(!candidates.length)return null;
      const point=candidates[Math.floor(Math.random()*candidates.length)];
      const x=point.x+Math.random()*Math.max(0,width-insets.right-sprite.width-point.x);
      const y=point.y+Math.random()*Math.max(0,height-insets.bottom-sprite.height-point.y);
      return fits(sprite,x,y,phrases)?{x,y}:point;
    }
    function draw(now,dt){
      ctx.clearRect(0,0,width,height);
      if(!fontReady)return;
      measure();
      // Revalidate complete bounds before drawing, including after scrolling
      // or a moving toolbar. Never mask only part of an existing phrase.
      phrases=phrases.filter(p=>fits(p.sprite,p.x,p.y));
      if(now>=next&&phrases.length<4){
        if(!bag.length)refill();
        for(let i=bag.length-1;i>=0;i--){
          const sprite=bag[i],point=place(sprite);
          if(point){phrases.push({sprite,...point,age:0});lastShown=sprite.index;bag.splice(i,1);break;}
        }
        next=now+3000+Math.random()*2000;
      }
      for(let i=phrases.length-1;i>=0;i--){
        const p=phrases[i];p.age+=dt;
        const y=p.y+(motion.matches?0:8*dt);
        // Stop drift at an exclusion boundary rather than clipping the text.
        if(fits(p.sprite,p.x,y,phrases.filter(other=>other!==p)))p.y=y;
        if(p.age>16){phrases.splice(i,1);continue;}
        ctx.globalAlpha=motion.matches?.72:.72*Math.min(1,p.age/1.2,(16-p.age)/2);
        ctx.drawImage(p.sprite.canvas,p.x,p.y,p.sprite.width,p.sprite.height);
      }
      ctx.globalAlpha=1;
    }
    function tick(now){
      frame=0;
      if(document.hidden||motion.matches)return;
      if(!last||now-last>=32){const dt=last?Math.min((now-last)/1000,.1):0;last=now;draw(now,dt);}
      frame=requestAnimationFrame(tick);
    }
    function restart(){
      cancelAnimationFrame(frame);frame=0;last=0;
      if(document.hidden||!fontReady)return;
      if(motion.matches){phrases=[];next=0;draw(performance.now(),0);}
      else frame=requestAnimationFrame(tick);
    }
    function resize(){
      const viewport=window.visualViewport;
      width=viewport?viewport.width:window.innerWidth;height=viewport?viewport.height:window.innerHeight;
      viewportX=viewport?viewport.offsetLeft:0;viewportY=viewport?viewport.offsetTop:0;
      canvas.style.width=width+'px';canvas.style.height=height+'px';
      canvas.style.left=viewportX+'px';canvas.style.top=viewportY+'px';
      const style=getComputedStyle(canvas);
      // Resolve safe-area lengths through computed padding on a lightweight probe.
      const probe=document.createElement('div');
      probe.style.cssText='position:fixed;visibility:hidden;pointer-events:none;padding-top:'+style.getPropertyValue('--ambient-top')+';padding-right:'+style.getPropertyValue('--ambient-right')+';padding-bottom:'+style.getPropertyValue('--ambient-bottom')+';padding-left:'+style.getPropertyValue('--ambient-left');
      document.body.appendChild(probe);
      const resolved=getComputedStyle(probe);
      insets={top:parseFloat(resolved.paddingTop)||24,right:parseFloat(resolved.paddingRight)||12,bottom:parseFloat(resolved.paddingBottom)||100,left:parseFloat(resolved.paddingLeft)||12};
      probe.remove();
      const scale=Math.min(window.devicePixelRatio||1,2);
      canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);
      ctx.setTransform(scale,0,0,scale,0,0);
      if(!fontReady)return;
      sprites=adhkar.map((value,index)=>{
        const surface=document.createElement('canvas'),text=surface.getContext('2d');
        const family=getComputedStyle(document.documentElement).getPropertyValue('--repo-font').trim();
        let size=16;
        text.font='500 '+size+'px '+family;text.direction='rtl';text.textAlign='center';
        while(text.measureText(value).width>width-48&&size>13){size--;text.font='500 '+size+'px '+family;}
        // Wrap long phrases instead of horizontally compressing Arabic glyphs.
        const lines=[];let line='';
        for(const word of value.split(' ')){
          const candidate=line?line+' '+word:word;
          if(line&&text.measureText(candidate).width>width-48){lines.push(line);line=word;}else line=candidate;
        }
        lines.push(line);
        const metrics=lines.map(line=>text.measureText(line));
        const w=Math.ceil(Math.max(...metrics.map(m=>Math.max(m.width,2*Math.abs(m.actualBoundingBoxLeft||0),2*Math.abs(m.actualBoundingBoxRight||0)))))+24;
        const ascent=Math.max(size,...metrics.map(m=>m.actualBoundingBoxAscent||size));
        const descent=Math.max(size*.5,...metrics.map(m=>m.actualBoundingBoxDescent||size*.5));
        const lineHeight=Math.ceil(ascent+descent+8),h=lineHeight*lines.length+24;
        surface.width=Math.ceil(w*scale);surface.height=Math.ceil(h*scale);
        text.scale(scale,scale);text.font='500 '+size+'px '+family;text.direction='rtl';
        text.textAlign='center';text.textBaseline='alphabetic';text.fillStyle='#c9b79f';
        lines.forEach((line,i)=>text.fillText(line,w/2,12+ascent+i*lineHeight));
        return {canvas:surface,width:w,height:h,index};
      });
      bag=[];
      phrases=[];next=0;measure();restart();
    }
    let resizing=0;
    function clearAmbient(){phrases=[];ctx.clearRect(0,0,width,height);}
    function scheduleResize(){
      clearAmbient();cancelAnimationFrame(frame);frame=0;
      clearTimeout(resizing);resizing=setTimeout(resize,120);
    }
    if(window.visualViewport){
      window.visualViewport.addEventListener('resize',scheduleResize,{passive:true});
      window.visualViewport.addEventListener('scroll',scheduleResize,{passive:true});
    }
    window.addEventListener('resize',scheduleResize,{passive:true});
    window.addEventListener('orientationchange',scheduleResize,{passive:true});
    document.addEventListener('visibilitychange',restart);
    window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);frame=0;clearTimeout(resizing);clearTimeout(scrolling);});
    window.addEventListener('pageshow',scheduleResize);
    if(motion.addEventListener)motion.addEventListener('change',restart);else motion.addListener(restart);
    // Static reduced-motion text only needs repainting after a scroll settles.
    let scrolling=0;
    window.addEventListener('scroll',()=>{
      clearAmbient();
      if(!motion.matches)return;
      clearTimeout(scrolling);scrolling=setTimeout(()=>{if(!document.hidden)draw(performance.now(),0);},120);
    },{passive:true});
    let contentFrame=0;
    function contentChanged(){
      clearAmbient();
      if(motion.matches&&!contentFrame)contentFrame=requestAnimationFrame(()=>{contentFrame=0;restart();});
    }
    const contentObserver=new MutationObserver(contentChanged);
    const layoutObserver=typeof ResizeObserver!=='undefined'?new ResizeObserver(contentChanged):null;
    function observeContent(){
      contentObserver.disconnect();if(layoutObserver)layoutObserver.disconnect();
      const main=document.querySelector('main:not([hidden])');
      if(main){
        contentObserver.observe(main,{subtree:true,childList:true,characterData:true,attributes:true});
        if(layoutObserver)layoutObserver.observe(main);
      }
      for(const element of document.querySelectorAll('#build-menu,#toast'))contentObserver.observe(element,{subtree:true,childList:true,attributes:true});
    }
    observeContent();
    document.addEventListener('repoviewwillchange',clearAmbient);
    document.addEventListener('repoviewchange',()=>{clearAmbient();next=0;observeContent();resize();});
    // No fallback-font sprites or measurements are allowed into the first frame.
    const fonts=document.fonts;
    const ready=fonts?Promise.all([fonts.load('500 16px "Repo Local"',adhkar.join(' ')),fonts.ready]):Promise.resolve();
    ready.then(()=>{fontReady=true;resize();}).catch(()=>{
      // A failed local request still has the explicit Arabic-capable fallback.
      fontReady=true;resize();
    });
    resize();
  }
  const radio=document.createElement('audio');radio.id='quran-radio';radio.preload='none';
  const button=document.createElement('button');button.id='quran-radio-button';
  button.type='button';button.className='icon-button quran-radio-button';
  const play='<path d="M8 5v14l11-7z"/>',pause='<path d="M6 4h4v16H6zm8 0h4v16h-4z"/>';
  let wanted=false,request=0,failureShown=false;
  function radioUI(active){
    button.setAttribute('aria-pressed',String(active));
    button.setAttribute('aria-label',active?'Pause Quran radio':'Play Quran radio');
    button.title=active?'Pause Quran radio':'Play Quran radio';
    button.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">'+(active?pause:play)+'</svg>';
  }
  function fail(){
    wanted=false;request++;radio.pause();radioUI(false);button.removeAttribute('aria-busy');
    if(!failureShown){failureShown=true;toast('Radio stream unavailable. Tap to retry.');}
    radio.removeAttribute('src');radio.load();
  }
  button.addEventListener('click',()=>{
    const token=++request;
    if(wanted){wanted=false;radio.pause();radioUI(false);button.removeAttribute('aria-busy');return;}
    wanted=true;failureShown=false;radioUI(!radio.paused);button.setAttribute('aria-busy','true');
    if(!radio.getAttribute('src'))radio.src='https://stream.radiojar.com/0tpy1h0kxtzuv';
    // Keep play() in the direct tap handler for iPhone Safari user activation.
    try{Promise.resolve(radio.play()).then(()=>{
      if(token!==request)return;
      button.removeAttribute('aria-busy');radioUI(wanted&&!radio.paused);
    }).catch(()=>{if(token===request&&wanted)fail();});}catch(error){fail();}
  });
  radio.addEventListener('play',()=>radioUI(!radio.paused));
  radio.addEventListener('waiting',()=>{if(wanted)button.setAttribute('aria-busy','true');});
  radio.addEventListener('playing',()=>{if(!wanted){radio.pause();return;}button.removeAttribute('aria-busy');radioUI(true);});
  radio.addEventListener('pause',()=>{if(radio.paused){wanted=false;radioUI(false);button.removeAttribute('aria-busy');}});
  radio.addEventListener('ended',()=>{wanted=false;radioUI(false);button.removeAttribute('aria-busy');});
  radio.addEventListener('error',()=>{if(wanted)fail();});
  radioUI(false);document.body.append(button,radio);
})();
