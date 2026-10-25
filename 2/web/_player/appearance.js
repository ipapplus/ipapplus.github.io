// Blocking, tiny head script: resolve appearance before styles or content paint.
(() => {
  const key=`diwan-theme:${new URL('../',document.currentScript.src).pathname}:v1`;
  const system=matchMedia('(prefers-color-scheme: dark)');
  let preference='auto';
  try {const saved=localStorage.getItem(key);if(['light','dark','auto'].includes(saved))preference=saved;}catch{}
  function apply(){
    const dark=preference==='dark'||(preference==='auto'&&system.matches);
    document.documentElement.dataset.theme=dark?'dark':'light';
    document.querySelector('meta[name="theme-color"]').content=dark?'#1c1c1e':'#f5f5f7';
    const button=document.getElementById('theme-toggle');
    if(button){
      if(window.DiwanTheme?.renderIcon)button.innerHTML=window.DiwanTheme.renderIcon(dark?'sun':'moon');
      button.setAttribute('aria-description',({auto:'المظهر يتبع الجهاز',light:'المظهر الفاتح محدد',dark:'المظهر الداكن محدد'})[preference]);
      button.setAttribute('aria-label',dark?'التبديل إلى المظهر الفاتح':'التبديل إلى المظهر الداكن');
    }
    const select=document.getElementById('theme-preference');if(select)select.value=preference;
  }
  function set(value){if(!['light','dark','auto'].includes(value))return;preference=value;try{localStorage.setItem(key,value);}catch{}apply();window.dispatchEvent(new CustomEvent('diwan-theme-change',{detail:value}));}
  apply();
  const followSystem=()=>{if(preference==='auto')apply();};
  if(system.addEventListener)system.addEventListener('change',followSystem);else system.addListener(followSystem);
  window.addEventListener('storage',event=>{if(event.key===key){preference=['light','dark','auto'].includes(event.newValue)?event.newValue:'auto';apply();}});
  window.addEventListener('pageshow',followSystem);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)followSystem();});
  window.DiwanTheme={apply,set,toggle:()=>set(document.documentElement.dataset.theme==='dark'?'light':'dark')};
})();

(() => {
  const key=`media-player:${new URL('../',document.currentScript.src).pathname}:v1`;
  let prefs={};try{prefs=JSON.parse(localStorage.getItem(key)||'{}')||{};}catch{}
  document.documentElement.dataset.font=prefs.font==='system'?'system':'heritage';
})();
