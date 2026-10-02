(function(){
  'use strict';
  const messages={
    en:{
      homeTitle:'ipapplus',packagesTitle:'Packages · ipapplus Repo',
      homeDescription:'Ahmed AlGhrbi · ipapplus jailbreak repository',
      packagesDescription:'Browse, search, and download packages from the ipapplus jailbreak repository.',
      systemsApps:'Systems & Apps',links:'Links',addSileo:'Add to Sileo',browsePackages:'Browse packages',
      sourceCopied:'Source URL copied',sourceCopyFailed:'Unable to copy the source URL.',
      repoName:'ipapplus Repo',packages:'Packages',skipPackages:'Skip to packages',
      language:'Language',switchArabic:'Switch to Arabic',switchEnglish:'Switch to English',
      lastUpdated:'Last updated',updatedUnknown:'Last updated: Unavailable',
      updatedTime:'Last updated: {time}',justNow:'Just now',
      minutesAgo:'{n}m ago',hoursAgo:'{n}h ago',daysAgo:'{n}d ago',oneDayAgo:'1d ago',addedTime:'Added {time}',
      refreshPackages:'Refresh packages',backToTop:'Back to top',
      searchFilter:'Search and filter packages',searchHelp:'Search by name, Package ID, description, or filename',
      searchPackages:'Search packages',clearSearch:'Clear search',filterArchitecture:'Filter by package architecture',
      all:'All',rootful:'Rootful',rootless:'Rootless',roothide:'RootHide',otherArchitecture:'Other',
      loadingPackages:'Loading packages…',resetFilters:'Reset filters',availablePackages:'Available packages',
      noPackagesFound:'No packages found',noPackagesAvailable:'No packages available',
      trySearch:'Try another search or package architecture.',emptyIndex:'This repository has no packages yet.',
      enableJS:'Enable JavaScript to browse packages.',chooseArchitecture:'Choose a package architecture',
      downloadChoose:'Download .deb · choose architecture',copyChoose:'Copy download link · choose architecture',
      downloadPackage:'Download {name}',copyPackage:'Copy download link for {name}',
      copiedPackage:'Download link copied for {name}',copied:'Copied',copyFailed:'Unable to copy. Try again.',
      downloadArchitecture:'Download .deb · {architecture}',downloadUnavailable:'Download unavailable',
      downloadDeb:'Download .deb',copyLink:'Copy download link',
      unnamedPackage:'Unnamed package',noDescription:'No description provided.',version:'Version {version}',
      packageCount:'{count} of {total} packages',refreshFailed:'Unable to refresh. Try again.',
      loadFailed:'Unable to load packages',indexFailed:'The package index could not be loaded',
      checkConnection:'Check your connection and try again.',tryAgain:'Try again',
      opensNewTab:'{name} (opens in a new tab)'
    },
    ar:{
      homeTitle:'ipapplus',packagesTitle:'الحزم · سورس ipapplus',
      homeDescription:'Ahmed AlGhrbi · سورس ipapplus للجيلبريك',
      packagesDescription:'تصفّح حزم سورس ipapplus للجيلبريك وابحث فيها وحمّلها.',
      systemsApps:'أنظمة وتطبيقات',links:'الروابط',addSileo:'إضافة إلى Sileo',browsePackages:'تصفّح الحزم',
      sourceCopied:'تم نسخ رابط السورس',sourceCopyFailed:'تعذّر نسخ رابط السورس.',
      repoName:'سورس ipapplus',packages:'الحزم',skipPackages:'الانتقال إلى الحزم',
      language:'اللغة',switchArabic:'التبديل إلى العربية',switchEnglish:'التبديل إلى الإنجليزية',
      lastUpdated:'آخر تحديث',updatedUnknown:'آخر تحديث: غير متاح',
      updatedTime:'آخر تحديث: {time}',justNow:'الآن',
      minutesAgo:'قبل {n} د',hoursAgo:'قبل {n} س',daysAgo:'قبل {n} ي',oneDayAgo:'قبل يوم',addedTime:'أُضيفت {time}',
      refreshPackages:'تحديث الحزم',backToTop:'العودة للأعلى',
      searchFilter:'البحث في الحزم وتصفيتها',searchHelp:'ابحث بالاسم أو معرّف الحزمة (Package ID) أو الوصف أو اسم الملف',
      searchPackages:'البحث في الحزم',clearSearch:'مسح البحث',filterArchitecture:'تصفية حسب معمارية الحزمة',
      all:'الكل',rootful:'Rootful',rootless:'Rootless',roothide:'RootHide',otherArchitecture:'أخرى',
      loadingPackages:'جارٍ تحميل الحزم…',resetFilters:'مسح الفلاتر',availablePackages:'الحزم المتاحة',
      noPackagesFound:'لا توجد حزم مطابقة',noPackagesAvailable:'لا توجد حزم متاحة',
      trySearch:'جرّب بحثًا آخر أو معمارية حزمة أخرى.',emptyIndex:'لا توجد حزم في هذا السورس بعد.',
      enableJS:'فعّل JavaScript لتصفّح الحزم.',chooseArchitecture:'اختر معمارية الحزمة',
      downloadChoose:'تحميل الحزمة · اختر المعمارية',copyChoose:'نسخ رابط التحميل · اختر المعمارية',
      downloadPackage:'تحميل {name}',copyPackage:'نسخ رابط تحميل {name}',
      copiedPackage:'تم نسخ رابط تحميل {name}',copied:'تم النسخ',copyFailed:'تعذّر النسخ. حاول مرة أخرى.',
      downloadArchitecture:'تحميل الحزمة · {architecture}',downloadUnavailable:'التحميل غير متاح',
      downloadDeb:'تحميل الحزمة',copyLink:'نسخ رابط التحميل',
      unnamedPackage:'حزمة بلا اسم',noDescription:'لا يوجد وصف.',version:'الإصدار {version}',
      packageCount:'الحزم: {count} من {total}',refreshFailed:'تعذّر التحديث. حاول مرة أخرى.',
      loadFailed:'تعذّر تحميل الحزم',indexFailed:'تعذّر تحميل فهرس الحزم',
      checkConnection:'تحقّق من الاتصال وحاول مرة أخرى.',tryAgain:'حاول مرة أخرى',
      opensNewTab:'{name} (يفتح في علامة تبويب جديدة)'
    }
  };
  let language='en';
  try{if(localStorage.getItem('repo-language')==='ar')language='ar';}catch(error){/* Storage may be disabled in Safari. */}
  function t(key,values={}){
    const message=messages[language][key]??messages.en[key]??key;
    return message.replace(/\{(\w+)\}/g,(_,name)=>String(values[name]??''));
  }
  function number(value){return new Intl.NumberFormat(language,{useGrouping:false,numberingSystem:language==='ar'?'arab':'latn'}).format(value);}
  const arabicDays=Intl.RelativeTimeFormat?new Intl.RelativeTimeFormat('ar-u-nu-arab',{numeric:'always',style:'short'}):null;
  function ago(key,count){
    if(language==='ar'&&key==='daysAgo'){
      if(count===1)return t('oneDayAgo');
      if(arabicDays)return arabicDays.format(-count,'day');
    }
    return t(key,{n:number(count)});
  }
  function date(value){return value.toLocaleString(language==='ar'?'ar':'en-GB');}
  function apply(){
    document.documentElement.lang=language;
    document.documentElement.dir=language==='ar'?'rtl':'ltr';
    document.querySelectorAll('[data-i18n]').forEach(node=>{node.textContent=t(node.dataset.i18n);});
    for(const attribute of ['aria-label','title','placeholder','content']){
      document.querySelectorAll('[data-i18n-'+attribute+']').forEach(node=>{
        node.setAttribute(attribute,t(node.getAttribute('data-i18n-'+attribute)));
      });
    }
    document.querySelectorAll('[data-language-switch]').forEach(button=>{
      const next=language==='ar'?'en':'ar';
      const label=button.querySelector('span');
      if(label){label.textContent=next==='ar'?'العربية':'English';label.lang=next;}
      button.setAttribute('aria-label',t(next==='ar'?'switchArabic':'switchEnglish'));
      button.title=button.getAttribute('aria-label');
    });
  }
  function setLanguage(value){
    language=value==='ar'?'ar':'en';
    try{localStorage.setItem('repo-language',language);}catch(error){/* Keep switching functional without storage. */}
    apply();document.dispatchEvent(new Event('repo:languagechange'));
  }
  window.RepoI18n={t,number,date,ago,setLanguage,get language(){return language;}};
  // Apply direction before first paint; translate the parsed DOM once it is ready.
  apply();
  document.addEventListener('DOMContentLoaded',()=>{
    apply();
    document.querySelectorAll('[data-language-switch]').forEach(button=>button.addEventListener('click',()=>setLanguage(language==='ar'?'en':'ar')));
  });
})();
