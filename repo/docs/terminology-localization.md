# Website terminology and localization audit

Audited on 2026-10-02. The website retains its existing design and repository behavior.

## Terminology decisions

| Concept | English UI | Arabic UI | Reason |
| --- | --- | --- | --- |
| Complete repository listing | Packages / Browse packages | الحزم / تصفّح الحزم | The index includes Fonts as well as Tweaks. A tweak is a kind of package, not a synonym for every package. |
| Repository | ipapplus Repo | سورس ipapplus | Repo is established jailbreak shorthand; سورس is familiar to Arabic-speaking jailbreak users. |
| Adding the repository | Add to Sileo | إضافة إلى Sileo | The existing Sileo source URL remains unchanged. This adds a source; it does not install a package. |
| Source URL | Source URL copied | تم نسخ رابط السورس | Describes the copied repository URL, not a package download. |
| Package architectures | Rootful / Rootless / RootHide | Rootful / Rootless / RootHide | Preserve established names. The filter is explicitly a package architecture filter. |
| Architecture choice | Choose a package architecture | اختر معمارية الحزمة | The menu selects architecture variants of the same Package ID and version, not a different release. |
| Package file action | Download .deb | تحميل الحزمة | The action downloads a package file; it does not install it. The Arabic tooltip avoids ambiguous dot direction in plain-text tooltips. |
| Clipboard action | Copy download link | نسخ رابط التحميل | Makes the clipboard contents explicit. |
| Identifier in search help | Package ID | معرّف الحزمة (Package ID) | Matches Theos terminology and retains the searchable technical term. |
| Repository timestamp | Last updated | آخر تحديث | Comes from the package index's Last-Modified header. The previous Last seen and static Online indicator did not represent real user activity. |
| Relative timestamps | 2m ago / 3h ago / 1d ago | قبل ٢ د / قبل ٣ س / قبل يوم | Compact and confined to the existing 88px action column. Arabic day counts use Intl.RelativeTimeFormat for correct dual/plural forms (قبل يومين / قبل ٣ أيام), with compact abbreviations as a fallback. |

Use sentence case for interface labels. Preserve RootHide capitalization. Sileo, Rootful, Rootless, RootHide, iOS, .deb, package IDs, versions, architecture values, personal names, and product names remain unchanged. Package names/descriptions and other author-provided metadata are never translated.

“Depiction” means a package's additional presentation/details page, including Sileo's native JSON depictions. It is distinct from the package's Description field. The current website does not expose a depiction action; this audit does not add one or rename package-provided fields.

Architecture filters describe the repository's packaging conventions; they are not device detection or guarantees of iOS, firmware, dependency, or jailbreak compatibility. In this repository, iphoneos-arm maps to Rootful, iphoneos-arm64 to Rootless, and iphoneos-arm64e to RootHide. Package architecture names should not be interpreted as device CPU compatibility alone.

## Primary sources

- [Sileo](https://getsileo.app/): APT package manager, repositories, packages, and sources.
- [Theos packaging](https://theos.dev/docs/packaging): Package ID, Architecture, Section, Description, Depiction, SileoDepiction, and rootful/rootless package architecture values.
- [Theos rootless documentation](https://theos.dev/docs/rootless): rootless packaging scheme and distinction from binary architectures.
- [RootHide developer documentation](https://github.com/roothide/Developer): RootHide package scheme and developer conventions.
- [RootHide Bootstrap Makefile](https://github.com/roothide/Bootstrap/blob/main/Makefile): iphoneos-arm64e packaging and roothide scheme.
- [Sileo native depictions](https://developer.getsileo.app/native-depictions): separate Depiction and SileoDepiction fields.
- [Debian control fields](https://www.debian.org/doc/debian-policy/ch-controlfields.html) and [package management FAQ](https://www.debian.org/doc/manuals/debian-faq/pkg-basics.en.html): package metadata and distinction between downloading and installing .deb packages.

## Localization structure

- `assets/js/i18n.js` owns semantic English/Arabic dictionaries, interpolation, number/date formatting, static DOM translation, the language switcher, and the `repo:languagechange` event.
- `repo-language` in localStorage remembers en/ar across both pages. Unavailable storage leaves switching functional; missing Arabic keys fall back to English.
- The script runs in the head to establish document lang/dir before painting. Static attributes are translated at DOMContentLoaded. Dynamic states remove their initial static key and render their current state when the language changes.
- `assets/js/website.js` localizes shared timestamps and toast feedback. Repeated timestamp updates clean up old timers/listeners. A missing Last-Modified header displays Unavailable / غير متاح.
- `assets/js/landing.js` handles localized source-copy feedback, the repository timestamp, and external-link accessibility labels.
- `assets/js/packages.js` localizes counts, loading/empty/error states, menu headings, tooltips, action labels, missing-metadata fallbacks, and addition timestamps without reloading data during language switching.
- Page titles, descriptions, placeholders, accessibility labels, and tooltips use semantic `data-i18n` attributes. Both pages have one shared implementation, not separate language copies.
- PWA names remain the language-neutral ipapplus brand; its manifest declares LTR for that name. The installed app's name is not dynamically renamed when the UI language changes.

## RTL and icons

- Document direction controls flex/grid flow. Search padding, toolbar placement, skip-link placement, safe-area spacing, and the floating button use logical CSS or direction-aware safe-area variables.
- The package action column remains 88px in both directions. Name/description alignment follows its component, while author text determines reading direction. Versions remain LTR. Architecture/menu labels use bdi elements.
- Mixed Arabic metadata retains its original text. Latin runs, including IDs, versions, iOS numbers, and .deb extensions, receive LTR bdi wrappers. No directional characters are inserted into stored metadata.
- Arabic headings, text leading, and letter spacing are tuned separately. Ellipsis fades follow the content's reading direction, including Arabic metadata in the English UI.
- Back and internal navigation chevrons mirror in RTL; Search, Download, Copy, Refresh, Back to Top, brand logos, and external arrows retain their conventional shapes.
- Added a globe language icon; changed the internal package-navigation arrow to a chevron; clarified Refresh's circular arrows; standardized outline icons to stroke width 2. Action targets retain at least 44px dimensions.
- Physical coordinates remain in the viewport-positioned architecture menu and geometrically centered toast. These are measured viewport coordinates, not unmirrored content alignment.
- The 190ms transform/opacity accordion implementation is retained. Language changes cancel current animations cleanly, preserving the expanded card and active filters where applicable.

## Verification and remaining checks

Passed syntax checks for all four JavaScript files using Apple's JavaScriptCore and `git diff --check`. A simulated DOM in JavaScriptCore exercised both languages with the actual package index/history and additional long/mixed Arabic fixtures. Checks covered dictionaries/placeholders, English fallback, stored language, the switch button, blocked storage, metadata preservation, newest sorting, Package ID search, filters, empty/error states, rapid accordion switching, reduced motion, Download/Copy/menu isolation, refresh deduplication, offline/history recovery, relative times, source-copy feedback, and timestamp timer cleanup.

The simulated viewport was 390×844. It does not verify CSS rendering, touch behavior, browser console output, or frame rate. An offscreen WKWebView renderer was attempted but timed out; no visual Safari pass is claimed.

Before release, render both pages in iPhone Safari at 390×844 and a narrow 320px width. In both languages, verify persistence after navigation/reload, card/menu placement, long Arabic names/descriptions with iOS 15 / v1.0 / com.example.package / .deb, icon alignment, safe areas with the bottom toolbar open, rapid card switching, scroll controls, and reduced motion. Check Safari's console for errors. Run Download/Copy for single-architecture and multi-architecture packages, and check that Sileo receives the original source URL.

APT metadata, .deb files, package history, repository endpoints, build scripts, and third-party depictions are unchanged. Package-provided English/Chinese text and external depiction pages can therefore remain non-Arabic; the website's localization intentionally does not translate them.
