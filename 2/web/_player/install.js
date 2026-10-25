import { isStandalone, watchDisplayMode } from './environment.js';

export function setupInstallation() {
  const button=document.getElementById('install-app'),guide=document.getElementById('install-guide');
  const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  let prompt=null,installed=false;
  const isInstalled=()=>installed||isStandalone();
  function close(focus=true){guide.hidden=true;button.setAttribute('aria-expanded','false');if(focus&&!button.hidden)button.focus();}
  function update(){button.hidden=isInstalled();if(button.hidden)close(false);}
  function show(){
    if(isInstalled())return;
    document.getElementById('install-ios').hidden=!ios;document.getElementById('install-other').hidden=ios;
    guide.hidden=false;button.setAttribute('aria-expanded','true');
    guide.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    guide.focus({preventScroll:true});
  }
  window.addEventListener('beforeinstallprompt',event=>{if(ios||isInstalled())return;event.preventDefault();prompt=event;});
  window.addEventListener('appinstalled',()=>{installed=true;prompt=null;update();});
  watchDisplayMode(update);
  button.onclick=()=>{
    if(isInstalled())return;
    if(ios||!prompt){show();return;}
    const event=prompt;prompt=null;
    // Call prompt synchronously from this click: no await before user activation.
    try {
      const opened=event.prompt();
      Promise.resolve(opened).then(()=>event.userChoice).then(choice=>{
        if(choice?.outcome==='accepted'){installed=true;update();}
        else document.getElementById('install-status').textContent='يمكنك تثبيت التطبيق لاحقًا من هذا الزر.';
      }).catch(show);
    } catch {show();}
  };
  document.getElementById('close-install').onclick=()=>close();
  guide.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}});
  update();
}
