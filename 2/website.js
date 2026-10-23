(function() {
  'use strict';
  if (window.RepoUI) return;

  const I18N = {
    en: {
      langName: 'English',
      langCode: 'en',
      brand: 'ipapplus',
      brandTagline: 'Systems & Apps · iOS Tweak Repository',
      authorName: 'Ahmed AlGhrbi',
      heroBio: 'Curated iOS tweaks, modifications, and system tools for rootful, rootless, and roothide jailbreaks.',
      onlineStatus: 'Online',
      addToSileo: 'Add to Sileo',
      addToZebra: 'Zebra',
      addToCydia: 'Cydia',
      copyRepoUrl: 'Copy URL',
      repoUrlCopied: 'Repository URL copied!',
      browseTweaks: 'Browse Tweaks',
      browseTweaksDesc: 'Explore, search, and download deb packages',
      availableTweaks: 'Available Tweaks',
      supportedArchitectures: 'Architectures',
      lastSeen: 'Last seen: {time}',
      lastUpdated: 'Updated: {time}',
      copyright: '© 2016–2026 Ahmed AlGhrbi · ipapplus',
      // Controls
      themeAuto: 'Appearance: System',
      themeLight: 'Appearance: Light',
      themeDark: 'Appearance: Dark',
      themeCycle: 'Switch appearance',
      langToggle: 'العربية',
      refreshPage: 'Refresh page',
      backHome: 'Home',
      backToTop: 'Back to top',
      // Package browser
      browserTitle: 'Tweaks',
      browserDocTitle: 'Tweaks · ipapplus Repo',
      homeDocTitle: 'Ahmed AlGhrbi · ipapplus',
      homeDocDesc: 'Ahmed AlGhrbi — Systems & Apps · iOS Tweak Repository',
      browserDocDesc: 'Browse, search, and download tweaks from the ipapplus repository.',
      searchPlaceholder: 'Search by name, ID, or developer…',
      clearSearch: 'Clear search',
      archAll: 'All',
      archRootful: 'Rootful',
      archRootless: 'Rootless',
      archRootHide: 'RootHide',
      packageCount: '{count} of {total} packages',
      packageCountSingle: '1 package',
      packageCountNone: 'No packages found',
      loadingPackages: 'Loading repository packages…',
      resetFilters: 'Reset filters',
      noPackagesFound: 'No packages found',
      noPackagesFoundDesc: 'Try another search term or change the architecture filter.',
      loadErrorTitle: 'Unable to load packages',
      loadErrorDesc: 'Check your internet connection and try again.',
      tryAgain: 'Try again',
      // Card actions & details
      download: 'Download',
      chooseBuild: 'Choose build',
      copyDownloadLink: 'Copy download link',
      linkCopied: 'Download link copied!',
      unableToCopy: 'Unable to copy. Try again.',
      versionLabel: 'Version',
      architectureLabel: 'Architecture',
      developerLabel: 'Developer',
      sizeLabel: 'Size',
      addedLabel: 'Added',
      packageIdLabel: 'Identifier',
      sectionLabel: 'Section',
      dependsLabel: 'Depends',
      detailsLabel: 'Details',
      closeMenu: 'Close',
      chooseBuildTitle: 'Choose architecture build',
      noDescription: 'No description provided.',
      // Quran Radio
      radioPlay: 'Play Quran radio',
      radioPause: 'Pause Quran radio',
      radioUnavailable: 'Radio stream unavailable. Tap to retry.',
      // PWA
      addToHomeScreen: 'Add to Home Screen',
      safariInstallHelp: 'In Safari, tap Share and select “Add to Home Screen”.',
      // Time
      justNow: 'Just now',
      minuteAgo: '1m ago',
      minutesAgo: '{n}m ago',
      hourAgo: '1h ago',
      hoursAgo: '{n}h ago',
      dayAgo: '1d ago',
      daysAgo: '{n}d ago'
    },
    ar: {
      langName: 'العربية',
      langCode: 'ar',
      brand: 'ipapplus',
      brandTagline: 'أنظمة وتطبيقات · سورس ipapplus للأدوات',
      authorName: 'أحمد الغربي',
      heroBio: 'أدوات وتعديلات iOS مخصصة ومختارة للجيلبريك: رووتفل، رووتلس، ورووت هايد.',
      onlineStatus: 'متصل',
      addToSileo: 'إضافة إلى Sileo',
      addToZebra: 'Zebra',
      addToCydia: 'Cydia',
      copyRepoUrl: 'نسخ الرابط',
      repoUrlCopied: 'نُسخ رابط السورس!',
      browseTweaks: 'تصفّح الأدوات',
      browseTweaksDesc: 'استعرض وابحث وحمّل حزم deb مباشرةً',
      availableTweaks: 'أداة متوفرة',
      supportedArchitectures: 'البيئات المدعومة',
      lastSeen: 'آخر ظهور: {time}',
      lastUpdated: 'حُدّث: {time}',
      copyright: '© 2016–2026 أحمد الغربي · ipapplus',
      // Controls
      themeAuto: 'المظهر: تلقائي',
      themeLight: 'المظهر: فاتح',
      themeDark: 'المظهر: داكن',
      themeCycle: 'تبديل المظهر',
      langToggle: 'English',
      refreshPage: 'تحديث الصفحة',
      backHome: 'الرئيسية',
      backToTop: 'للأعلى',
      // Package browser
      browserTitle: 'الأدوات',
      browserDocTitle: 'الأدوات · سورس ipapplus',
      homeDocTitle: 'أحمد الغربي · ipapplus',
      homeDocDesc: 'أحمد الغربي — أنظمة وتطبيقات · سورس أدوات iOS',
      browserDocDesc: 'استعرض وابحث وحمّل أدوات وحزم سورس ipapplus.',
      searchPlaceholder: 'ابحث بالاسم، المعرّف، أو المطور…',
      clearSearch: 'مسح البحث',
      archAll: 'الكل',
      archRootful: 'رووتفل',
      archRootless: 'رووتلس',
      archRootHide: 'رووت هايد',
      packageCount: '{count} من أصل {total} أداة',
      packageCountSingle: 'أداة واحدة',
      packageCountNone: 'لا توجد أدوات مطابقة',
      loadingPackages: 'جارٍ جلب أدوات السورس…',
      resetFilters: 'إعادة ضبط التصفية',
      noPackagesFound: 'لم نعثر على أدوات مطابقة',
      noPackagesFoundDesc: 'جرّب عبارة بحث أخرى أو غيّر تصفية البيئة.',
      loadErrorTitle: 'تعذّر تحميل الأدوات',
      loadErrorDesc: 'تحقق من اتصالك بالإنترنت ثم حاول مرة أخرى.',
      tryAgain: 'حاول مرة أخرى',
      // Card actions & details
      download: 'تحميل',
      chooseBuild: 'اختر البناء',
      copyDownloadLink: 'نسخ رابط التحميل',
      linkCopied: 'نُسخ رابط التحميل!',
      unableToCopy: 'تعذّر النسخ. حاول مرة أخرى.',
      versionLabel: 'الإصدار',
      architectureLabel: 'البيئة',
      developerLabel: 'المطور',
      sizeLabel: 'الحجم',
      addedLabel: 'أُضيفت',
      packageIdLabel: 'المعرّف',
      sectionLabel: 'القسم',
      dependsLabel: 'الاعتماديات',
      detailsLabel: 'التفاصيل',
      closeMenu: 'إغلاق',
      chooseBuildTitle: 'اختر معمارية البناء',
      noDescription: 'لا يتوفر وصف لهذه الأداة.',
      // Quran Radio
      radioPlay: 'تشغيل إذاعة القرآن الكريم',
      radioPause: 'إيقاف إذاعة القرآن الكريم',
      radioUnavailable: 'البث غير متاح حاليًا. المس للمحاولة مجددًا.',
      // PWA
      addToHomeScreen: 'إضافة إلى الشاشة الرئيسية',
      safariInstallHelp: 'في Safari، اضغط على زر المشاركة ثم اختر «إضافة إلى الشاشة الرئيسية».',
      // Time
      justNow: 'الآن',
      minuteAgo: 'منذ دقيقة',
      minutesAgo: 'منذ {n} دقيقة',
      hourAgo: 'منذ ساعة',
      hoursAgo: 'منذ {n} ساعة',
      dayAgo: 'منذ يوم',
      daysAgo: 'منذ {n} يوم'
    }
  };

  // Determine language preference
  function detectInitialLanguage() {
    try {
      const stored = localStorage.getItem('repo-lang');
      if (stored === 'ar' || stored === 'en') return stored;
    } catch (e) {}
    const navLangs = navigator.languages || [navigator.language || ''];
    for (const l of navLangs) {
      if (typeof l === 'string' && l.toLowerCase().startsWith('ar')) return 'ar';
    }
    return 'en';
  }

  // Determine theme preference
  function detectInitialTheme() {
    try {
      const stored = localStorage.getItem('repo-theme');
      if (stored === 'dark' || stored === 'light' || stored === 'system') return stored;
    } catch (e) {}
    return 'system';
  }

  let currentLang = detectInitialLanguage();
  let currentTheme = detectInitialTheme();

  function t(key, params = {}) {
    const dict = I18N[currentLang] || I18N.en;
    let text = dict[key] || I18N.en[key] || key;
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp('\\{' + k + '\\}', 'g'), String(v));
    }
    return text;
  }

  function formatRelativeTime(date, now = Date.now()) {
    if (!date || !Number.isFinite(date.getTime()) || !Number.isFinite(now)) return '';
    const seconds = Math.max(0, Math.floor((now - date.getTime()) / 1000));
    if (seconds < 60) return t('justNow');
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes === 1 ? t('minuteAgo') : t('minutesAgo', { n: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours === 1 ? t('hourAgo') : t('hoursAgo', { n: hours });
    const days = Math.floor(hours / 24);
    return days === 1 ? t('dayAgo') : t('daysAgo', { n: days });
  }

  function formatAdditionTime(date, now = Date.now()) {
    if (!date || !Number.isFinite(date.getTime()) || !Number.isFinite(now)) return '';
    const minutes = Math.max(1, Math.floor((now - date.getTime()) / 60000));
    if (minutes >= 1440) return Math.floor(minutes / 1440) + 'd';
    if (minutes >= 60) return Math.floor(minutes / 60) + 'h';
    return minutes + 'm';
  }

  function updateThemeMeta() {
    const root = document.documentElement;
    let isDark = true;
    if (currentTheme === 'light') isDark = false;
    else if (currentTheme === 'dark') isDark = true;
    else isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    const themeColor = isDark ? '#0b0d13' : '#f8f6f0';
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', themeColor);

    // Update theme toggle icons and labels
    document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
      const modeKey = currentTheme === 'system' ? 'themeAuto' : currentTheme === 'light' ? 'themeLight' : 'themeDark';
      btn.setAttribute('aria-label', t(modeKey));
      btn.setAttribute('title', t(modeKey));
      const iconAuto = btn.querySelector('.theme-icon-auto');
      const iconLight = btn.querySelector('.theme-icon-light');
      const iconDark = btn.querySelector('.theme-icon-dark');
      if (iconAuto) iconAuto.hidden = currentTheme !== 'system';
      if (iconLight) iconLight.hidden = currentTheme !== 'light';
      if (iconDark) iconDark.hidden = currentTheme !== 'dark';
    });
  }

  function setTheme(theme) {
    if (!['system', 'dark', 'light'].includes(theme)) theme = 'system';
    currentTheme = theme;
    try { localStorage.setItem('repo-theme', theme); } catch (e) {}

    const root = document.documentElement;
    if (theme === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
    updateThemeMeta();
    document.dispatchEvent(new CustomEvent('repothemechange', { detail: { theme } }));
  }

  function cycleTheme() {
    if (currentTheme === 'system') setTheme('dark');
    else if (currentTheme === 'dark') setTheme('light');
    else setTheme('system');
  }

  // Listen to OS appearance changes
  const schemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleSchemeChange = () => {
    if (currentTheme === 'system') updateThemeMeta();
  };
  if (schemeQuery.addEventListener) schemeQuery.addEventListener('change', handleSchemeChange);
  else if (schemeQuery.addListener) schemeQuery.addListener(handleSchemeChange);

  function applyLanguage(lang) {
    if (lang !== 'ar' && lang !== 'en') lang = 'en';
    currentLang = lang;
    try { localStorage.setItem('repo-lang', lang); } catch (e) {}

    const root = document.documentElement;
    root.setAttribute('lang', lang);
    root.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

    // Update document title and description if applicable
    const isPackages = document.body.classList.contains('browser-page') || document.querySelector('#package-list');
    document.title = isPackages ? t('browserDocTitle') : t('homeDocTitle');
    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) descMeta.setAttribute('content', isPackages ? t('browserDocDesc') : t('homeDocDesc'));

    // Update all i18n text nodes
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) el.textContent = t(key);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) el.setAttribute('placeholder', t(key));
    });

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (key) el.setAttribute('title', t(key));
    });

    document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
      const key = el.getAttribute('data-i18n-aria-label');
      if (key) el.setAttribute('aria-label', t(key));
    });

    // Update language toggle text
    document.querySelectorAll('[data-lang-toggle]').forEach(btn => {
      btn.textContent = t('langToggle');
      const toggleLabel = lang === 'ar' ? 'Switch to English' : 'التحويل إلى العربية';
      btn.setAttribute('aria-label', toggleLabel);
      btn.setAttribute('title', toggleLabel);
    });

    updateThemeMeta();
    document.dispatchEvent(new CustomEvent('repolangchange', { detail: { lang } }));
  }

  function toggleLanguage() {
    applyLanguage(currentLang === 'ar' ? 'en' : 'ar');
  }

  // Toast notifications
  function toast(message) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 2400);
  }

  // Clipboard copy helper
  async function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch (e) {}
    }
    const prev = document.activeElement;
    const area = document.createElement('textarea');
    area.value = value;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px;pointer-events:none;'; // taste-skill-ignore
    document.body.appendChild(area);
    area.focus({ preventScroll: true });
    area.select();
    area.setSelectionRange(0, value.length);
    try {
      const success = document.execCommand('copy');
      if (!success) throw new Error('Copy command failed');
      return true;
    } finally {
      area.remove();
      if (prev && prev.isConnected) prev.focus({ preventScroll: true });
    }
  }

  // Tactile press response tracking
  let pressedTarget = null, pressPointerId = null, startX = 0, startY = 0;
  function releasePress() {
    if (pressedTarget) pressedTarget.classList.remove('is-pressed');
    pressedTarget = null;
    pressPointerId = null;
  }

  document.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    releasePress();
    const target = event.target.closest('button, a, .package-entry, .browse-tweaks-card');
    if (!target || target.disabled || target.getAttribute('aria-disabled') === 'true') return;
    pressedTarget = target;
    pressPointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    pressedTarget.classList.add('is-pressed');
  }, { passive: true });

  document.addEventListener('pointermove', event => {
    if (event.pointerId === pressPointerId && Math.hypot(event.clientX - startX, event.clientY - startY) > 10) {
      releasePress();
    }
  }, { passive: true });

  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => {
    document.addEventListener(type, releasePress, { passive: true });
  });
  window.addEventListener('blur', releasePress);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) releasePress();
  });

  // Track modified header
  function trackModified(element, header, labelKey = 'lastUpdated') {
    if (!element) return;
    const date = header ? new Date(header) : null;
    if (!date || Number.isNaN(date.getTime())) return;
    function refresh() {
      element.textContent = t(labelKey, { time: formatRelativeTime(date) });
      element.title = date.toLocaleString();
    }
    refresh();
    clearInterval(element._modifiedTimer);
    if (element._visibilityListener) document.removeEventListener('visibilitychange', element._visibilityListener);
    element._modifiedTimer = setInterval(refresh, 60000);
    element._visibilityListener = () => { if (!document.hidden) refresh(); };
    document.addEventListener('visibilitychange', element._visibilityListener);
    document.addEventListener('repolangchange', refresh);
  }

  // Load additions history
  let additionsPromise = null;
  function loadAdditions(force = false) {
    if (force) additionsPromise = null;
    if (!additionsPromise) {
      additionsPromise = fetch('latest-additions.json', { cache: 'no-cache' })
        .then(res => {
          if (!res.ok) throw new Error('Additions request failed');
          return res.json();
        })
        .then(entries => {
          if (!Array.isArray(entries)) throw new Error('Invalid additions format');
          return entries.sort((a, b) => Date.parse(b.addedAt) - Date.parse(a.addedAt));
        })
        .catch(err => {
          additionsPromise = null;
          throw err;
        });
    }
    return additionsPromise;
  }

  const versionKey = (packageId, version) => JSON.stringify([packageId, version]);
  const isStandalone = () => window.navigator.standalone === true || Boolean(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);

  // Global event delegation for refresh, theme, and language
  document.addEventListener('click', event => {
    const refreshBtn = event.target.closest('[data-page-refresh]');
    if (refreshBtn && !refreshBtn.disabled) {
      refreshBtn.classList.add('is-refreshing');
      refreshBtn.setAttribute('aria-busy', 'true');
      window.location.reload();
      return;
    }

    const themeBtn = event.target.closest('[data-theme-toggle]');
    if (themeBtn) {
      cycleTheme();
      return;
    }

    const langBtn = event.target.closest('[data-lang-toggle]');
    if (langBtn) {
      toggleLanguage();
      return;
    }
  });

  window.addEventListener('pageshow', () => {
    document.querySelectorAll('[data-page-refresh]').forEach(btn => {
      btn.classList.remove('is-refreshing');
      btn.removeAttribute('aria-busy');
    });
  });

  // Athkar Ambient Canvas
  function initAthkarCanvas() {
    if (document.getElementById('adhkar-background')) return;
    const canvas = document.createElement('canvas');
    canvas.id = 'adhkar-background';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.dir = 'rtl';
    document.body.prepend(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const adhkar = [
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

    let width = 0, height = 0, phrases = [], sprites = [], frame = 0, last = 0, next = 0, lastShown = -1;
    let bag = [], insets = { top: 24, right: 16, bottom: 80, left: 16 };
    let exclusions = [], fontReady = false;
    const margin = 14;

    function refill() {
      bag = sprites.slice();
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      if (bag.length > 1 && bag[bag.length - 1].index === lastShown) {
        [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
      }
    }

    function measureExclusions() {
      const main = document.querySelector('main:not([hidden])');
      if (!main) { exclusions = []; return; }
      const elements = [main];
      elements.push(...document.querySelectorAll('.quran-radio-btn, .back-to-top-btn, .btn-back, .toast-msg.show, .package-choices-sheet.is-open'));
      exclusions = elements.filter(el => !el.hidden && getComputedStyle(el).visibility !== 'hidden').map(el => {
        const r = el.getBoundingClientRect();
        return {
          left: r.left - margin,
          right: r.right + margin,
          top: r.top - margin,
          bottom: r.bottom + margin
        };
      }).filter(r => r.right > 0 && r.left < width && r.bottom > 0 && r.top < height);
    }

    function fits(sprite, x, y, others = []) {
      const r = { left: x, right: x + sprite.width, top: y, bottom: y + sprite.height };
      return r.left >= insets.left && r.right <= width - insets.right &&
             r.top >= insets.top && r.bottom <= height - insets.bottom &&
             !exclusions.some(e => r.left < e.right && r.right > e.left && r.top < e.bottom && r.bottom > e.top) &&
             !others.some(p => r.left < p.x + p.sprite.width + margin && r.right > p.x - margin && r.top < p.y + p.sprite.height + margin && r.bottom > p.y - margin);
    }

    function place(sprite) {
      const xs = [insets.left, ...exclusions.map(r => r.right)];
      const ys = [insets.top, ...exclusions.map(r => r.bottom)];
      const candidates = [];
      for (const x of xs) {
        for (const y of ys) {
          if (fits(sprite, x, y, phrases)) candidates.push({ x, y });
        }
      }
      if (!candidates.length) return null;
      const point = candidates[Math.floor(Math.random() * candidates.length)];
      const x = point.x + Math.random() * Math.max(0, width - insets.right - sprite.width - point.x);
      const y = point.y + Math.random() * Math.max(0, height - insets.bottom - sprite.height - point.y);
      return fits(sprite, x, y, phrases) ? { x, y } : point;
    }

    function draw(now, dt) {
      ctx.clearRect(0, 0, width, height);
      if (!fontReady) return;
      measureExclusions();
      phrases = phrases.filter(p => fits(p.sprite, p.x, p.y));
      if (now >= next && phrases.length < 3) {
        if (!bag.length) refill();
        for (let i = bag.length - 1; i >= 0; i--) {
          const sprite = bag[i], point = place(sprite);
          if (point) {
            phrases.push({ sprite, ...point, age: 0 });
            lastShown = sprite.index;
            bag.splice(i, 1);
            break;
          }
        }
        next = now + 3500 + Math.random() * 2500;
      }
      for (let i = phrases.length - 1; i >= 0; i--) {
        const p = phrases[i];
        p.age += dt;
        const y = p.y + (motion.matches ? 0 : 6 * dt);
        if (fits(p.sprite, p.x, y, phrases.filter(o => o !== p))) p.y = y;
        if (p.age > 16) { phrases.splice(i, 1); continue; }
        ctx.globalAlpha = motion.matches ? 0.6 : 0.6 * Math.min(1, p.age / 1.5, (16 - p.age) / 2);
        ctx.drawImage(p.sprite.canvas, p.x, p.y, p.sprite.width, p.sprite.height);
      }
      ctx.globalAlpha = 1;
    }

    function tick(now) {
      frame = 0;
      if (document.hidden || motion.matches) return;
      if (!last || now - last >= 32) {
        const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
        last = now;
        draw(now, dt);
      }
      frame = requestAnimationFrame(tick);
    }

    function restart() {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      if (document.hidden || !fontReady) return;
      if (motion.matches) { phrases = []; next = 0; draw(performance.now(), 0); }
      else frame = requestAnimationFrame(tick);
    }

    function resize() {
      const viewport = window.visualViewport;
      width = viewport ? viewport.width : window.innerWidth;
      height = viewport ? viewport.height : window.innerHeight;
      const vx = viewport ? viewport.offsetLeft : 0;
      const vy = viewport ? viewport.offsetTop : 0;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      canvas.style.left = vx + 'px';
      canvas.style.top = vy + 'px';

      const probe = document.createElement('div');
      probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding-top:max(24px,env(safe-area-inset-top));padding-right:max(16px,env(safe-area-inset-right));padding-bottom:max(80px,env(safe-area-inset-bottom));padding-left:max(16px,env(safe-area-inset-left));';
      document.body.appendChild(probe);
      const res = getComputedStyle(probe);
      insets = {
        top: parseFloat(res.paddingTop) || 24,
        right: parseFloat(res.paddingRight) || 16,
        bottom: parseFloat(res.paddingBottom) || 80,
        left: parseFloat(res.paddingLeft) || 16
      };
      probe.remove();

      const scale = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      if (!fontReady) return;

      const compStyle = getComputedStyle(document.documentElement);
      const athkarColor = compStyle.getPropertyValue('--athkar-color').trim() || '#d8a46b';
      const fontFam = compStyle.getPropertyValue('--font-stack').trim() || 'sans-serif';

      sprites = adhkar.map((textVal, idx) => {
        const surf = document.createElement('canvas');
        const sctx = surf.getContext('2d');
        let size = 15;
        sctx.font = '500 ' + size + 'px ' + fontFam;
        sctx.direction = 'rtl';
        sctx.textAlign = 'center';
        while (sctx.measureText(textVal).width > width - 48 && size > 12) {
          size--;
          sctx.font = '500 ' + size + 'px ' + fontFam;
        }
        const m = sctx.measureText(textVal);
        const w = Math.ceil(m.width) + 24;
        const h = Math.ceil(size * 1.5) + 16;
        surf.width = Math.ceil(w * scale);
        surf.height = Math.ceil(h * scale);
        sctx.scale(scale, scale);
        sctx.font = '500 ' + size + 'px ' + fontFam;
        sctx.direction = 'rtl';
        sctx.textAlign = 'center';
        sctx.textBaseline = 'middle';
        sctx.fillStyle = athkarColor;
        sctx.fillText(textVal, w / 2, h / 2);
        return { canvas: surf, width: w, height: h, index: idx };
      });

      bag = [];
      phrases = [];
      next = 0;
      measureExclusions();
      restart();
    }

    let resizeTimer = 0;
    function scheduleResize() {
      cancelAnimationFrame(frame);
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 120);
    }

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', scheduleResize, { passive: true });
      window.visualViewport.addEventListener('scroll', scheduleResize, { passive: true });
    }
    window.addEventListener('resize', scheduleResize, { passive: true });
    document.addEventListener('visibilitychange', restart);
    document.addEventListener('repothemechange', resize);
    document.addEventListener('repoviewchange', () => { phrases = []; next = 0; resize(); });

    if (document.fonts) {
      document.fonts.ready.then(() => { fontReady = true; resize(); });
    } else {
      fontReady = true;
      resize();
    }
  }

  // Quran Radio Stream Controller
  function initQuranRadio() {
    if (document.getElementById('quran-radio-btn')) return;
    const radio = document.createElement('audio');
    radio.id = 'quran-radio';
    radio.preload = 'none';

    const btn = document.createElement('button');
    btn.id = 'quran-radio-btn';
    btn.type = 'button';
    btn.className = 'quran-radio-btn';

    const playSvg = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
    const pauseSvg = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>';

    let wanted = false, reqId = 0;
    function updateUI(active) {
      btn.setAttribute('aria-pressed', String(active));
      const label = t(active ? 'radioPause' : 'radioPlay');
      btn.setAttribute('aria-label', label);
      btn.title = label;
      btn.innerHTML = active ? pauseSvg : playSvg;
    }

    function handleFail() {
      wanted = false;
      reqId++;
      radio.pause();
      updateUI(false);
      btn.removeAttribute('aria-busy');
      toast(t('radioUnavailable'));
      radio.removeAttribute('src');
      radio.load();
    }

    btn.addEventListener('click', () => {
      const curReq = ++reqId;
      if (wanted) {
        wanted = false;
        radio.pause();
        updateUI(false);
        btn.removeAttribute('aria-busy');
        return;
      }
      wanted = true;
      updateUI(!radio.paused);
      btn.setAttribute('aria-busy', 'true');
      if (!radio.getAttribute('src')) {
        radio.src = 'https://stream.radiojar.com/0tpy1h0kxtzuv';
      }
      try {
        Promise.resolve(radio.play()).then(() => {
          if (curReq !== reqId) return;
          btn.removeAttribute('aria-busy');
          updateUI(wanted && !radio.paused);
        }).catch(() => {
          if (curReq === reqId && wanted) handleFail();
        });
      } catch (e) {
        handleFail();
      }
    });

    radio.addEventListener('play', () => updateUI(!radio.paused));
    radio.addEventListener('playing', () => {
      if (!wanted) { radio.pause(); return; }
      btn.removeAttribute('aria-busy');
      updateUI(true);
    });
    radio.addEventListener('pause', () => {
      if (radio.paused) { wanted = false; updateUI(false); btn.removeAttribute('aria-busy'); }
    });
    radio.addEventListener('ended', () => { wanted = false; updateUI(false); btn.removeAttribute('aria-busy'); });
    radio.addEventListener('error', () => { if (wanted) handleFail(); });

    document.addEventListener('repolangchange', () => updateUI(wanted && !radio.paused));
    updateUI(false);
    document.body.append(btn, radio);
  }

  window.RepoUI = {
    get lang() { return currentLang; },
    get theme() { return currentTheme; },
    setLanguage: applyLanguage,
    setTheme: setTheme,
    cycleTheme: cycleTheme,
    toggleLanguage: toggleLanguage,
    t: t,
    relativeTime: formatRelativeTime,
    additionTime: formatAdditionTime,
    loadAdditions: loadAdditions,
    trackModified: trackModified,
    toast: toast,
    copyText: copyText,
    versionKey: versionKey,
    isStandalone: isStandalone
  };

  // Initial setup on script execution
  setTheme(currentTheme);
  applyLanguage(currentLang);
  initAthkarCanvas();
  initQuranRadio();
})();
