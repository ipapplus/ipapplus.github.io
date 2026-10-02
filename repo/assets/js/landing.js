(function(){
  'use strict';
  const {t}=RepoI18n;
  document.querySelectorAll('a[target="_blank"]').forEach(link=>{
    const name=link.querySelector('.label').textContent;
    const update=()=>link.setAttribute('aria-label',t('opensNewTab',{name}));
    update();document.addEventListener('repo:languagechange',update);
  });
  document.getElementById('sileo').addEventListener('click',()=>{
    RepoUI.copyText('https://ipapplus.github.io').then(()=>RepoUI.toast('sourceCopied')).catch(()=>RepoUI.toast('sourceCopyFailed'));
  });
  fetch('Packages',{cache:'no-cache'}).then(response=>{
    if(!response.ok)throw new Error('Package index request failed');
    RepoUI.trackModified(document.getElementById('last-seen'),response.headers.get('Last-Modified'));
  }).catch(()=>{});
})();
