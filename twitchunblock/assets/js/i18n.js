(function () {
'use strict';
const translations = {
  "en": {
    "auth.activate": "Open Twitch to authorize",
    "auth.waiting": "Authorize TwitchUnblock in Twitch. Keep this page open while signing in.",
    "auth.cancel": "Cancel sign-in",
    "auth.loginExpired": "Sign-in timed out. Please try again.",
    "about.skip.to.content": "Skip to content",
    "about.an.ipapplus.project": "An ipapplus project",
    "about.native.ios.open.source": "Native iOS · Open source",
    "about.maintained.fork.by.ahmed.alghrbi": "Maintained fork by Ahmed AlGhrbi",
    "about.a.native.twitch.client.for.live.streams.vods.and.chat.this.fork.a": "A native Twitch client for live streams, VODs, and chat. This fork adds a clearer way to explore past broadcasts, recover compatible streams, and use the app in Arabic.",
    "about.view.releases": "View Releases",
    "about.fork.features": "Fork features",
    "about.past.streams": "Past Streams",
    "about.arabic.rtl": "Arabic & RTL",
    "about.credits": "Credits",
    "about.latest.release": "Latest release",
    "about.latest.fork.ipa": "Latest fork IPA",
    "about.tag": "Tag",
    "about.published": "Published",
    "about.checking.github.for.the.latest.release": "Checking GitHub for the latest release…",
    "about.javascript.is.off.github.releases.always.has.the.latest.version.a": "JavaScript is off. GitHub Releases always has the latest version and IPA download.",
    "about.what.this.fork.adds": "What this fork adds",
    "about.built.on.twitchunblock": "Built on TwitchUnblock",
    "about.historical.broadcasts.in.one.list.with.exact.dates.relative.ages.": "Historical broadcasts in one list, with exact dates, relative ages, titles, categories, and duration where available.",
    "about.know.what.s.available": "Know what’s available",
    "about.public.availability.status.and.automatic.lightweight.recoverabili": "Public availability status and automatic lightweight recoverability checks help you choose what to try next.",
    "about.one.tap.historical.recovery": "One-tap historical Recovery",
    "about.start.a.validated.search.from.an.eligible.broadcast.without.copyi": "Start a validated search from an eligible broadcast without copying its stream ID or timestamp.",
    "about.history.that.stays.useful": "History that stays useful",
    "about.a.persistent.local.archive.and.shared.metadata.archive.retain.dis": "A persistent local archive and shared metadata archive retain discoveries. Source-aware merging protects verified broadcast details.",
    "about.arabic.clearer.chat": "Arabic & clearer chat",
    "about.arabic.localization.rtl.layouts.a.saudi.flag.language.indicator.a": "Arabic localization, RTL layouts, a Saudi flag language indicator, and improved direction for mixed Arabic and Latin messages.",
    "about.fork.owned.releases": "Fork-owned releases",
    "about.ipa.downloads.and.update.checks.follow.this.fork.s.releases.maint": "IPA downloads and update checks follow this fork’s releases, maintained by Ahmed AlGhrbi.",
    "about.from.the.original.project": "From the original project",
    "about.find.a.broadcast": "Find a broadcast",
    "about.past.streams.one.clear.path": "Past Streams, one clear path",
    "about.browse.historical.records.gathered.from.local.history.the.shared.": "Browse historical records gathered from local history, the shared archive, and vodvod.top. Exact timestamps stay visible alongside relative time.",
    "about.choose.a.broadcast": "Choose a broadcast",
    "about.availability": "Availability",
    "about.check.its.public.status": "Check its public status",
    "about.recoverability": "Recoverability",
    "about.look.for.a.positive.check": "Look for a positive check",
    "about.recover": "Recover",
    "about.validate.available.media": "Validate available media",
    "about.playback": "Playback",
    "about.open.a.valid.result": "Open a valid result",
    "about.local.shared.history": "Local + shared history",
    "about.previously.discovered.metadata.survives.app.restarts.the.shared.a": "Previously discovered metadata survives app restarts. The shared archive helps fill gaps; an outage does not erase your local records. It shares broadcast metadata, not video or personal watch history.",
    "about.safer.metadata.merging": "Safer metadata merging",
    "about.useful.fields.enrich.the.same.list.without.duplicate.broadcasts.v": "Useful fields enrich the same list without duplicate broadcasts. Verified Recovery details take priority, and conflicting critical metadata can keep a record visible without offering unsafe Recovery.",
    "about.saved.metadata.is.not.an.offline.video.download.the.shared.archiv": "Saved metadata is not an offline video download. The shared archive is powered by Cloudflare Worker + D1.",
    "about.try.compatible.broadcasts": "Try compatible broadcasts",
    "about.recovery.with.validation": "Recovery with validation",
    "about.historical.stream.metadata.can.help.locate.a.compatible.broadcast": "Historical stream metadata can help locate a compatible broadcast that is no longer publicly listed. The app checks the playlist and media before handing a valid result to the player.",
    "about.one.tap.recovery.uses.trusted.details.from.past.streams.manual.an": "One-tap Recovery uses trusted details from Past Streams. Manual and supported TwitchTracker input remain available in the app.",
    "about.recovery.depends.on.media.still.being.available.on.twitch.s.serve": "Recovery depends on media still being available on Twitch’s servers. It cannot restore every deleted broadcast. “Unavailable publicly” is not proof of deletion.",
    "about.arabic.is.part.of.the.app": "Arabic is part of the app",
    "about.full.arabic.localization.and.rtl.layouts.with.natural.plural.form": "Full Arabic localization and RTL layouts, with natural plural forms and improved chat direction. Mixed Arabic, usernames, links, numbers, badges, and emotes keep their reading order.",
    "about.choose.arabic.from.the.app.s.language.settings.identified.by.the.": "Choose Arabic from the app’s language settings, identified by the Saudi flag.",
    "about.get.the.app": "Get the app",
    "about.download.the.latest.fork.ipa": "Download the latest fork IPA",
    "about.for.iphone.and.ipad.running.ios.16.or.later.install.the.ipa.with.": "For iPhone and iPad running iOS 16 or later. Install the IPA with a compatible signing tool, such as AltStore, SideStore, or Feather.",
    "about.the.download.follows.the.latest.published.github.release": "The download follows the latest published GitHub release.",
    "about.about.credits": "About & credits",
    "about.independent.open.source.project.not.affiliated.with.twitch": "Independent open-source project. Not affiliated with Twitch.",
    "common.backtoipapplus": "Back to ipapplus",
    "common.allreleases": "All releases",
    "common.viewreleases": "View Releases",
    "about.rich.0": "Live and VOD playback, Twitch chat, quality controls, Picture in Picture, a sleep timer, and channel browsing come from <a href=\"https://github.com/MXFia19/TwitchUnblock\">MXFia19’s TwitchUnblock</a>. This fork builds on that work.",
    "about.rich.1": "Original TwitchUnblock by <a href=\"https://github.com/MXFia19/TwitchUnblock\">MXFia19</a>. Fork maintained by <a href=\"https://github.com/ipapplus/TwitchUnblock\">Ahmed AlGhrbi / ipapplus</a>. Original credits and the MIT license are preserved.",
    "about.rich.2": "This page introduces the native fork. The separate upstream <a href=\"https://github.com/MXFia19/TwitchUnblock-Web\">browser project</a> is maintained by MXFia19.",
    "about.label.onthispage": "On this page",
    "about.label.historicalrecoveryflow": "Historical Recovery flow",
    "language": "Language",
    "openApp": "Open Web App",
    "home": "Home",
    "search": "Search",
    "history": "History",
    "settings": "Settings",
    "about": "About",
    "navigation": "Main navigation",
    "webTitle": "TwitchUnblock — Web App",
    "webSubtitle": "Your TwitchUnblock web app",
    "foundation": "A familiar home for what comes next.",
    "homeIntro": "The web app foundation is ready. Explore the sections below or visit About for the native app, releases, and project details.",
    "emptyHome": "No streams yet",
    "emptyHomeText": "Streams will appear here when browsing is available.",
    "searchLabel": "Channel or username",
    "searchPlaceholder": "Enter a username",
    "searchInfo": "Channel search is coming in a later phase.",
    "emptySearch": "Search is being prepared",
    "emptyHistory": "Your history is empty",
    "historyInfo": "Watched streams will appear here when playback is available.",
    "settingsInfo": "Choose your language. Your preference applies to the web app and About.",
    "phase": "Web app foundation",
    "skip": "Skip to content",
    "downloadIPA": "Download IPA",
    "viewReleases": "View Releases",
    "releaseLoading": "Checking GitHub for the latest release…",
    "releaseFallback": "Release details couldn’t be loaded. GitHub Releases has the latest IPA.",
    "noteFallback": "Open GitHub Releases to choose the latest IPA.",
    "releasePublished": "Published by ipapplus/TwitchUnblock.",
    "releaseNoIPA": "No single app IPA could be selected. View the release to choose an asset.",
    "noteNoIPA": "Choose an available IPA from the release page.",
    "assetNote": "Direct GitHub release asset: {name}",
    "downloadLabel": "Download {name}",
    "justNow": "Just now"
  },
  "ar": {
    "auth.activate": "فتح Twitch للموافقة",
    "auth.waiting": "وافق على TwitchUnblock في Twitch، واترك هذه الصفحة مفتوحة حتى يكتمل تسجيل الدخول.",
    "auth.cancel": "إلغاء تسجيل الدخول",
    "auth.loginExpired": "انتهت مهلة تسجيل الدخول. حاول مرة أخرى.",
    "about.skip.to.content": "انتقل إلى المحتوى",
    "about.an.ipapplus.project": "أحد مشاريع ipapplus",
    "about.native.ios.open.source": "تطبيق iOS أصلي · مفتوح المصدر",
    "about.maintained.fork.by.ahmed.alghrbi": "نسخة معدلة يطوّرها Ahmed AlGhrbi",
    "about.a.native.twitch.client.for.live.streams.vods.and.chat.this.fork.a": "تطبيق Twitch أصلي للبث المباشر والبثوث المسجلة والدردشة. تضيف هذه النسخة طريقة أوضح لاستكشاف البثوث السابقة واسترجاع البثوث المتوافقة واستخدام التطبيق بالعربية.",
    "about.view.releases": "عرض الإصدارات",
    "about.fork.features": "ميزات النسخة المعدلة",
    "about.past.streams": "البثوث السابقة",
    "about.arabic.rtl": "العربية واتجاه RTL",
    "about.credits": "الشكر والتقدير",
    "about.latest.release": "آخر إصدار",
    "about.latest.fork.ipa": "أحدث ملف IPA للنسخة المعدلة",
    "about.tag": "وسم الإصدار",
    "about.published": "تاريخ النشر",
    "about.checking.github.for.the.latest.release": "جارٍ البحث عن أحدث إصدار على GitHub…",
    "about.javascript.is.off.github.releases.always.has.the.latest.version.a": "JavaScript معطّل. يمكنك دائمًا العثور على أحدث إصدار وتحميل IPA من إصدارات GitHub.",
    "about.what.this.fork.adds": "ميزات النسخة المعدلة",
    "about.built.on.twitchunblock": "مبني على TwitchUnblock",
    "about.historical.broadcasts.in.one.list.with.exact.dates.relative.ages.": "البثوث السابقة في قائمة واحدة، مع تواريخها الدقيقة والوقت المنقضي وعناوينها وتصنيفاتها ومدتها عند توفرها.",
    "about.know.what.s.available": "اعرف ما هو متاح",
    "about.public.availability.status.and.automatic.lightweight.recoverabili": "تساعدك حالة الإتاحة العامة والفحوص التلقائية الخفيفة لإمكانية الاسترجاع على اختيار البث الذي تريد تجربته.",
    "about.one.tap.historical.recovery": "استرجاع البثوث السابقة بلمسة واحدة",
    "about.start.a.validated.search.from.an.eligible.broadcast.without.copyi": "ابدأ بحثًا مع التحقق من بث مؤهل، دون نسخ معرّف البث أو توقيته.",
    "about.history.that.stays.useful": "سجل يحتفظ بفائدته",
    "about.a.persistent.local.archive.and.shared.metadata.archive.retain.dis": "يحفظ الأرشيف المحلي الدائم وأرشيف البيانات الوصفية المشترك النتائج المكتشفة. ويراعي دمج البيانات مصادرها لحماية تفاصيل البث التي تم التحقق منها.",
    "about.arabic.clearer.chat": "العربية ودردشة أوضح",
    "about.arabic.localization.rtl.layouts.a.saudi.flag.language.indicator.a": "تعريب وواجهات من اليمين إلى اليسار، ومؤشر لغة بعلم السعودية، وتحسين اتجاه الرسائل التي تجمع بين العربية والحروف اللاتينية.",
    "about.fork.owned.releases": "إصدارات خاصة بهذه النسخة",
    "about.ipa.downloads.and.update.checks.follow.this.fork.s.releases.maint": "تعتمد تنزيلات IPA وفحوص التحديث على إصدارات هذه النسخة التي يطوّرها Ahmed AlGhrbi.",
    "about.from.the.original.project": "من المشروع الأصلي",
    "about.find.a.broadcast": "ابحث عن بث",
    "about.past.streams.one.clear.path": "البثوث السابقة، بخطوات واضحة",
    "about.browse.historical.records.gathered.from.local.history.the.shared.": "تصفّح سجلات البثوث السابقة من السجل المحلي والأرشيف المشترك وvodvod.top. تظهر التواريخ الدقيقة إلى جانب الوقت المنقضي.",
    "about.choose.a.broadcast": "اختر بثًا",
    "about.availability": "الإتاحة",
    "about.check.its.public.status": "تحقق من حالة إتاحته للعامة",
    "about.recoverability": "إمكانية الاسترجاع",
    "about.look.for.a.positive.check": "ابحث عن نتيجة تحقق إيجابية",
    "about.recover": "استرجاع",
    "about.validate.available.media": "تحقق من الوسائط المتاحة",
    "about.playback": "التشغيل",
    "about.open.a.valid.result": "افتح نتيجة صالحة",
    "about.local.shared.history": "سجل محلي ومشترك",
    "about.previously.discovered.metadata.survives.app.restarts.the.shared.a": "تبقى البيانات الوصفية المكتشفة محفوظة بعد إعادة تشغيل التطبيق. يساعد الأرشيف المشترك على استكمالها، ولا يمحو انقطاع الخدمة سجلاتك المحلية. يشارك بيانات البث الوصفية فقط، دون الفيديو أو سجل مشاهدتك الشخصي.",
    "about.safer.metadata.merging": "دمج أكثر أمانًا للبيانات الوصفية",
    "about.useful.fields.enrich.the.same.list.without.duplicate.broadcasts.v": "تُضاف الحقول المفيدة إلى القائمة نفسها دون تكرار البثوث. تُعطى الأولوية لتفاصيل الاسترجاع المتحقق منها، وقد يبقى السجل ظاهرًا عند تعارض البيانات الأساسية دون إتاحة استرجاع غير آمن.",
    "about.saved.metadata.is.not.an.offline.video.download.the.shared.archiv": "حفظ البيانات الوصفية لا يعني تنزيل الفيديو للمشاهدة دون اتصال. يعمل الأرشيف المشترك باستخدام Cloudflare Worker + D1.",
    "about.try.compatible.broadcasts": "جرّب البثوث المتوافقة",
    "about.recovery.with.validation": "استرجاع مع التحقق",
    "about.historical.stream.metadata.can.help.locate.a.compatible.broadcast": "قد تساعد بيانات البث السابقة في العثور على بث متوافق لم يعد ظاهرًا للعامة. يتحقق التطبيق من قائمة التشغيل والوسائط قبل إرسال نتيجة صالحة إلى المشغّل.",
    "about.one.tap.recovery.uses.trusted.details.from.past.streams.manual.an": "يستخدم الاسترجاع بلمسة واحدة تفاصيل موثوقة من البثوث السابقة. ويبقى الإدخال اليدوي وإدخال TwitchTracker المدعوم متاحين في التطبيق.",
    "about.recovery.depends.on.media.still.being.available.on.twitch.s.serve": "يعتمد الاسترجاع على بقاء الوسائط متاحة على خوادم Twitch. ولا يمكنه استعادة كل بث محذوف. عبارة «غير متاح للعامة» لا تعني بالضرورة أن البث محذوف.",
    "about.arabic.is.part.of.the.app": "العربية جزء من التطبيق",
    "about.full.arabic.localization.and.rtl.layouts.with.natural.plural.form": "تعريب كامل وواجهات من اليمين إلى اليسار، مع صيغ جمع طبيعية وتحسين اتجاه الدردشة. تحافظ العربية وأسماء المستخدمين والروابط والأرقام والشارات والرموز التعبيرية على ترتيب قراءتها عند مزجها.",
    "about.choose.arabic.from.the.app.s.language.settings.identified.by.the.": "اختر العربية من إعدادات لغة التطبيق؛ ستجدها مميزة بعلم السعودية.",
    "about.get.the.app": "احصل على التطبيق",
    "about.download.the.latest.fork.ipa": "تحميل أحدث IPA للنسخة المعدلة",
    "about.for.iphone.and.ipad.running.ios.16.or.later.install.the.ipa.with.": "لأجهزة iPhone وiPad بنظام iOS 16 أو أحدث. ثبّت ملف IPA باستخدام أداة توقيع متوافقة مثل AltStore أو SideStore أو Feather.",
    "about.the.download.follows.the.latest.published.github.release": "يتبع التنزيل أحدث إصدار منشور على GitHub.",
    "about.about.credits": "حول المشروع والشكر والتقدير",
    "about.independent.open.source.project.not.affiliated.with.twitch": "مشروع مستقل مفتوح المصدر، غير تابع لـ Twitch.",
    "common.backtoipapplus": "العودة إلى ipapplus",
    "common.allreleases": "جميع الإصدارات",
    "common.viewreleases": "عرض الإصدارات",
    "about.rich.0": "تشغيل البث المباشر والمسجل ودردشة Twitch والتحكم بالجودة وصورة داخل صورة ومؤقت النوم وتصفّح القنوات ميزات من <a href=\"https://github.com/MXFia19/TwitchUnblock\"><bdi dir=\"ltr\">TwitchUnblock</bdi> من <bdi dir=\"ltr\">MXFia19</bdi></a>. تستند هذه النسخة إلى ذلك العمل.",
    "about.rich.1": "مشروع TwitchUnblock الأصلي من <a href=\"https://github.com/MXFia19/TwitchUnblock\"><bdi dir=\"ltr\">MXFia19</bdi></a>. يطوّر النسخة المعدلة <a href=\"https://github.com/ipapplus/TwitchUnblock\"><bdi dir=\"ltr\">Ahmed AlGhrbi / ipapplus</bdi></a>. حُفظت الإشادات الأصلية وترخيص MIT.",
    "about.rich.2": "تعرّف هذه الصفحة بالنسخة المعدلة من التطبيق الأصلي. يطوّر MXFia19 <a href=\"https://github.com/MXFia19/TwitchUnblock-Web\">مشروع المتصفح</a> الأصلي المنفصل.",
    "about.label.onthispage": "أقسام هذه الصفحة",
    "about.label.historicalrecoveryflow": "خطوات استرجاع البثوث السابقة",
    "language": "اللغة",
    "openApp": "فتح تطبيق الويب",
    "home": "الرئيسية",
    "search": "البحث",
    "history": "السجل",
    "settings": "الإعدادات",
    "about": "حول المشروع",
    "navigation": "التنقل الرئيسي",
    "webTitle": "TwitchUnblock — تطبيق الويب",
    "webSubtitle": "تطبيق TwitchUnblock على الويب",
    "foundation": "واجهة مألوفة لما يأتي لاحقًا.",
    "homeIntro": "الواجهة الأساسية لتطبيق الويب جاهزة. استكشف الأقسام أدناه، أو افتح صفحة حول المشروع للتعرف على التطبيق الأصلي وإصداراته وتفاصيل المشروع.",
    "emptyHome": "لا توجد بثوث بعد",
    "emptyHomeText": "ستظهر البثوث هنا عند إتاحة التصفح.",
    "searchLabel": "القناة أو اسم المستخدم",
    "searchPlaceholder": "أدخل اسم مستخدم",
    "searchInfo": "سيُتاح البحث عن القنوات في مرحلة لاحقة.",
    "emptySearch": "البحث قيد الإعداد",
    "emptyHistory": "سجلك فارغ",
    "historyInfo": "ستظهر البثوث التي شاهدتها هنا عند إتاحة التشغيل.",
    "settingsInfo": "اختر لغتك. يُطبّق اختيارك على تطبيق الويب وصفحة حول المشروع.",
    "phase": "الواجهة الأساسية لتطبيق الويب",
    "skip": "انتقل إلى المحتوى",
    "downloadIPA": "تحميل IPA",
    "viewReleases": "عرض الإصدارات",
    "releaseLoading": "جارٍ البحث عن أحدث إصدار على GitHub…",
    "releaseFallback": "تعذّر تحميل تفاصيل الإصدار. تجد أحدث IPA في إصدارات GitHub.",
    "noteFallback": "افتح إصدارات GitHub لاختيار أحدث IPA.",
    "releasePublished": "نُشر بواسطة ipapplus/TwitchUnblock.",
    "releaseNoIPA": "تعذّر تحديد ملف IPA واحد للتطبيق. افتح الإصدار لاختيار الملف.",
    "noteNoIPA": "اختر ملف IPA متاحًا من صفحة الإصدار.",
    "assetNote": "ملف الإصدار المباشر من GitHub: {name}",
    "downloadLabel": "تحميل {name}",
    "justNow": "الآن"
  }
};
Object.assign(translations.en, {
 aboutTitle: 'TwitchUnblock — ipapplus fork',
 aboutDescription: 'TwitchUnblock for iOS, maintained by Ahmed AlGhrbi. Explore historical streams, validated Recovery, Arabic and RTL support, and download the latest fork IPA.',
 aboutImage: 'TwitchUnblock, maintained fork by Ahmed AlGhrbi. Past Streams, Recovery, Arabic and RTL.',
 webDescription: 'TwitchUnblock Web App: a bilingual foundation for future browsing.',
 webImage: 'TwitchUnblock Web App by ipapplus'
});
Object.assign(translations.ar, {
 aboutTitle: 'TwitchUnblock — نسخة ipapplus المعدلة',
 aboutDescription: 'تطبيق TwitchUnblock لنظام iOS، يطوّره Ahmed AlGhrbi. استكشف البثوث السابقة والاسترجاع مع التحقق ودعم العربية واتجاه RTL، وحمّل أحدث IPA للنسخة المعدلة.',
 aboutImage: 'نسخة TwitchUnblock التي يطوّرها Ahmed AlGhrbi. البثوث السابقة والاسترجاع والعربية واتجاه RTL.',
 webDescription: 'تطبيق TwitchUnblock على الويب: واجهة أساسية بالعربية والإنجليزية للتصفح في المراحل القادمة.',
 webImage: 'تطبيق TwitchUnblock على الويب من ipapplus'
});
Object.assign(translations.en, {
  "phase": "Twitch discovery",
  "foundation": "Discover live channels, recent broadcasts, and clips.",
  "webDescription": "Browse Twitch channels, live streams, recent broadcasts, and clips in English or Arabic.",
  "auth.login": "Sign in with Twitch",
  "auth.logout": "Log out",
  "auth.unconfigured": "Twitch sign-in is not available yet. The site owner needs to configure their Twitch application.",
  "auth.required": "Sign in with Twitch to browse live channels and search.",
  "auth.expired": "Your session has expired. Please sign in again.",
  "auth.failed": "Sign-in could not be verified. Please try again.",
  "auth.denied": "Sign-in was cancelled. You can try again whenever you are ready.",
  "auth.retry": "We could not verify your session. Please sign in again.",
  "auth.storage": "Allow session storage in your browser to sign in securely.",
  "api.timeout": "Twitch took too long to respond. Please try again.",
  "api.rateLimit": "Too many requests. Please wait a moment before trying again.",
  "api.failed": "Twitch data could not be loaded. Please try again.",
  "api.malformed": "Twitch returned incomplete data. Please try again.",
  "data.loading": "Loading…",
  "data.refresh": "Refresh",
  "home.liveIntro": "Live channels on Twitch",
  "home.empty": "No live channels are available right now.",
  "search.prompt": "Enter a channel name and select Search.",
  "search.empty": "Enter a channel name first.",
  "search.invalid": "Use a shorter channel name.",
  "search.liveOnly": "Live channels only",
  "search.noResults": "No matching channels were found.",
  "channel.heading": "Channel",
  "channel.notFound": "This channel could not be found.",
  "channel.live": "Live",
  "channel.offline": "Offline",
  "channel.game": "Category",
  "channel.viewers": "{count} viewers",
  "channel.uptime": "Live for (hours:minutes)",
  "channel.openTwitch": "Open on Twitch",
  "channel.back": "Back to search",
  "media.videos": "Recent VODs",
  "media.clips": "Clips",
  "media.empty.videos": "No recent VODs are available.",
  "media.empty.clips": "No clips are available.",
  "media.untitled": "Untitled",
  "media.views": "{count} views",
  "history.intro": "Recently opened channels, saved on this device.",
  "history.opened": "Opened {date}",
  "history.clear": "Clear history",
  "history.cleared": "History cleared.",
  "history.storage": "Your browser could not save history. It is available only until this page closes."
});
Object.assign(translations.ar, {
  "phase": "استكشاف Twitch",
  "foundation": "استكشف القنوات المباشرة والبثوث الأخيرة والمقاطع.",
  "webDescription": "تصفّح قنوات Twitch والبثوث المباشرة والأخيرة والمقاطع بالعربية أو الإنجليزية.",
  "auth.login": "تسجيل الدخول عبر Twitch",
  "auth.logout": "تسجيل الخروج",
  "auth.unconfigured": "تسجيل الدخول عبر Twitch غير متاح بعد. يلزم أن يُعدّ صاحب الموقع تطبيق Twitch الخاص به.",
  "auth.required": "سجّل الدخول عبر Twitch لتصفّح القنوات المباشرة والبحث.",
  "auth.expired": "انتهت صلاحية جلستك. يرجى تسجيل الدخول مجددًا.",
  "auth.failed": "تعذّر التحقق من تسجيل الدخول. يرجى المحاولة مجددًا.",
  "auth.denied": "أُلغي تسجيل الدخول. يمكنك المحاولة مجددًا متى شئت.",
  "auth.retry": "تعذّر التحقق من جلستك. يرجى تسجيل الدخول مجددًا.",
  "auth.storage": "اسمح بتخزين بيانات الجلسة في متصفحك لتسجيل الدخول بأمان.",
  "api.timeout": "استغرق رد Twitch وقتًا طويلًا. يرجى المحاولة مجددًا.",
  "api.rateLimit": "طلبات كثيرة. يرجى الانتظار قليلًا قبل المحاولة مجددًا.",
  "api.failed": "تعذّر تحميل بيانات Twitch. يرجى المحاولة مجددًا.",
  "api.malformed": "أعاد Twitch بيانات غير مكتملة. يرجى المحاولة مجددًا.",
  "data.loading": "جارٍ التحميل…",
  "data.refresh": "تحديث",
  "home.liveIntro": "قنوات تبث مباشرة على Twitch",
  "home.empty": "لا توجد قنوات مباشرة متاحة حاليًا.",
  "search.prompt": "أدخل اسم قناة ثم اختر البحث.",
  "search.empty": "أدخل اسم قناة أولًا.",
  "search.invalid": "استخدم اسم قناة أقصر.",
  "search.liveOnly": "القنوات المباشرة فقط",
  "search.noResults": "لم نعثر على قنوات مطابقة.",
  "channel.heading": "القناة",
  "channel.notFound": "لم نعثر على هذه القناة.",
  "channel.live": "مباشر",
  "channel.offline": "غير متصل",
  "channel.game": "التصنيف",
  "channel.viewers": "المشاهدون: {count}",
  "channel.uptime": "مدة البث (ساعات:دقائق)",
  "channel.openTwitch": "فتح على Twitch",
  "channel.back": "العودة إلى البحث",
  "media.videos": "البثوث المسجلة الأخيرة",
  "media.clips": "المقاطع",
  "media.empty.videos": "لا توجد بثوث مسجلة حديثة متاحة.",
  "media.empty.clips": "لا توجد مقاطع متاحة.",
  "media.untitled": "دون عنوان",
  "media.views": "المشاهدات: {count}",
  "history.intro": "القنوات التي فتحتها مؤخرًا، محفوظة على هذا الجهاز.",
  "history.opened": "فُتحت في {date}",
  "history.clear": "مسح السجل",
  "history.cleared": "مُسح السجل.",
  "history.storage": "تعذّر حفظ السجل في المتصفح. سيبقى متاحًا حتى إغلاق هذه الصفحة فقط."
});
function isolateTechnical() {
 const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
 const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
 const pattern = /(?:https?:\/\/[^\s،؛]+|ipapplus\/TwitchUnblock|Ahmed AlGhrbi(?: \/ ipapplus)?|TwitchUnblock(?:\.ipa)?|TwitchTracker|Cloudflare Worker \+ D1|vodvod\.top|MXFia19|AltStore|SideStore|Feather|JavaScript|GitHub|Recovery|iPhone|iPad|Twitch|RTL|IPA|iOS(?: 16)?|MIT|D1|ipapplus)/g;
 for (const node of nodes) {
  if (node.parentElement.closest('bdi,[dir="ltr"],script,style,svg,noscript')) continue;
  const text = node.textContent; pattern.lastIndex = 0;
  if (!pattern.test(text)) continue;
  pattern.lastIndex = 0; const fragment = document.createDocumentFragment(); let start = 0;
  for (const match of text.matchAll(pattern)) {
   fragment.append(document.createTextNode(text.slice(start, match.index)));
   const span = document.createElement('bdi'); span.dir = 'ltr'; span.textContent = match[0]; fragment.append(span); start = match.index + match[0].length;
  }
  fragment.append(document.createTextNode(text.slice(start))); node.replaceWith(fragment);
 }
}
const storageKey = 'twitchunblock.language';
let language;
function saved() { try { return localStorage.getItem(storageKey); } catch (_) { return null; } }
function detect() { return (navigator.languages || [navigator.language]).some(value => /^ar(?:-|$)/i.test(value)) ? 'ar' : 'en'; }
function t(key, values = {}) { return (translations[language][key] || translations.en[key] || key).replace(/\{(\w+)\}/g, (_, key) => values[key] ?? ''); }
function apply() {
 document.documentElement.lang = language;
 document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
 document.querySelectorAll('[data-i18n]').forEach(el => el.textContent = t(el.dataset.i18n));
 // HTML translations are static trusted project copy, never API data.
 document.querySelectorAll('[data-i18n-html]').forEach(el => el.innerHTML = t(el.dataset.i18nHtml));
 ['aria-label','title','placeholder'].forEach(attr => document.querySelectorAll('[data-i18n-'+attr+']').forEach(el => el.setAttribute(attr, t(el.getAttribute('data-i18n-'+attr)))));
 document.querySelectorAll('[data-language]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.language === language)));
 document.querySelectorAll('[data-i18n-content]').forEach(el => el.setAttribute('content', t(el.dataset.i18nContent)));
 isolateTechnical();
 document.dispatchEvent(new CustomEvent('languagechange'));
}
function setLanguage(value, persist = true) {
 if (!translations[value]) return;
 language = value;
 if (persist) { try { localStorage.setItem(storageKey, value); } catch (_) {} }
 apply();
}
language = translations[saved()] ? saved() : detect();
document.documentElement.lang = language;
document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
window.TwitchI18n = { t, setLanguage, isolateTechnical, get language() { return language; }, storageKey,
 relativeTime(date, now = Date.now()) {
  const seconds = Math.max(0, Math.floor((now - date.getTime()) / 1000));
  if (seconds < 60) return t('justNow');
  const [size, unit] = [[31536000,'year'],[2592000,'month'],[604800,'week'],[86400,'day'],[3600,'hour'],[60,'minute']].find(([size]) => seconds >= size);
  const count = Math.floor(seconds / size);
  if (language === 'ar' && count <= 2) {
    const forms = { minute: ['دقيقة','دقيقتين'], hour: ['ساعة','ساعتين'], day: ['يوم','يومين'], week: ['أسبوع','أسبوعين'], month: ['شهر','شهرين'], year: ['سنة','سنتين'] };
    return 'قبل ' + forms[unit][count - 1];
  }
  return new Intl.RelativeTimeFormat(language, { numeric: 'always' }).format(-count, unit);
 }
};
document.addEventListener('DOMContentLoaded', apply);
document.addEventListener('click', event => { const button = event.target.closest('[data-language]'); if (button) setLanguage(button.dataset.language); });
window.addEventListener('storage', event => { if (event.key === storageKey) setLanguage(translations[event.newValue] ? event.newValue : detect(), false); });
window.addEventListener('pageshow', () => { const value = saved(); setLanguage(translations[value] ? value : detect(), false); });
})();
