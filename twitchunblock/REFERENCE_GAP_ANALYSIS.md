# TwitchUnblock reference gap analysis

Audit date: 2026-10-07. Baseline own commit: `f869897e79c93c4070db50595ef727be5562a6ed`.
Reference clone: `/home/pc/TwitchUnblock-Web-reference`, shallow/read-only analysis; inspected commit `a691861d57d49509bb30ebf17fec90b1d6630864`.

Sources: [reference repository](https://github.com/MXFia19/TwitchUnblock-Web/tree/a691861d57d49509bb30ebf17fec90b1d6630864), [reference live site](https://test2-fawn-eta.vercel.app), [own production](https://ipapplus.github.io/twitchunblock/). Reference source modules are `public/assets/js/main.js`, `api.js`, `player.js`, `store.js`, `chat/*`, and `public/assets/styles.css`. No reference code, credentials, Worker endpoint, deployment settings or analytics were adopted.

Evidence levels: **Observed** means inspected in the live browser; **source-supported** means implemented paths exist but the entire remote service/account capability was not authenticated or exercised. A README claim alone is not a successful live test. Original login/sync were source-inspected, not authorized with the owner's account. Desktop Chromium and WebKit automation is not a physical iPhone or spoken VoiceOver certification. References to current/mine below describe the pre-P0 baseline; the final section records the actual P0 outcome.

## 1. Executive summary

The original is a watching application. The baseline is a small authenticated discovery client. That is a product gap, not a color gap: the original turns a glance at a thumbnail into a channel, a playable live/VOD/clip, and chat; the baseline turns a name into six external media links. Home has no categories or personal return path, Search requires submission, channel media has neither artwork nor tabs, and mobile navigation disappears on scroll.

The baseline already has working owned OAuth/Helix, natural Arabic/RTL, an appropriate gold theme, small modules, safe text rendering, explicit API errors, and a preserved project About page. Those strengths should remain. P0 improves discovery and stateful navigation; it cannot honestly claim parity with a watch application until P1/player and P2/chat exist.

The reference's anonymous discovery relies on Twitch GQL and its infrastructure, not a reusable anonymous Helix trick. We will not borrow it. Our documented Helix adapter still needs user sign-in. Account-followed channels need additional `user:read:follows` consent; device-saved channels must not be mislabeled Twitch follows. Collections have no documented Helix equivalent and must not become a fake empty tab.

## 2. Complete feature matrix

Status and severity measure the baseline gap for the requested audience. “Yes” is source-supported unless marked observed in the detailed sections. Counts use the fixed criteria below; they are an audit checklist, not universal feature totals. Partial support counts as support; algorithmic recommendations and Twitch follow mutation are excluded from reference support because they were not established.

| Feature | Original TwitchUnblock-Web | My current Web App (baseline) | Status | Gap severity | Recommended implementation priority |
|---|---|---|---|---|---|
| Home top live streams | Yes, anonymous/local or worldwide | Partial, 12 after login | Weak | HIGH | P0 |
| Home stream preview thumbnails | Yes | No | Missing | HIGH | P0 |
| Home channel avatars | Yes | Yes | Present | LOW | Keep |
| Home titles/categories/viewers/uptime | Yes, periodic metadata updates | Partial, uptime ticks; counts stale | Weak | HIGH | P0 |
| Home followed Twitch channels | Yes, account scope | No, no follows scope | Missing | HIGH | P0 follow-up permission |
| Home local saved channels | Yes, anonymous device follows | No | Missing | HIGH | P0 |
| Home offline saved/followed channels | Yes, separate segment | No | Missing | MEDIUM | P0 |
| Home categories | Yes, dedicated category browser | No | Missing | HIGH | P0 |
| Category stream drill-down | Yes | No | Missing | HIGH | P0 |
| Category search/favorites/pagination | Yes | No | Missing | MEDIUM | P0/P4 |
| Home Continue Watching | Yes, progress rail | No | Missing | HIGH | P1 |
| Home recent channels | Yes, search chip list | History tab only | Weak | MEDIUM | P0 |
| Personalized recommendations | Top/local/followed; no proven personalization model | No | Not equivalent to algorithmic recommendations | LOW | Do not invent |
| Home skeletons | Yes | Loading text only | Weak | MEDIUM | P0 |
| Home refresh without losing cards | Yes, silent refresh option | No, clears rows on every visit | Weak | HIGH | P0 |
| Home grid/list preference | Yes | Grid only | Missing | LOW | P4 |
| Anonymous real discovery | Yes, GQL and own backend | No, Helix needs login | Missing | HIGH | Separate owned-data strategy |
| Search dedicated entry | Streamer tab/form | Search tab/form | Present but generic | MEDIUM | P0 |
| Search as-you-type suggestions | Yes, seven local/remote rows | No | Missing | HIGH | P0 |
| Search arrow/Enter/Escape selection | Yes | Submit only | Missing | HIGH | P0 |
| Search exact offline lookup | Channel info lookup | Yes, users plus search | Present | LOW | Keep |
| Search live-only filter | Suggestions show live state; not same filter | Yes | Ahead | LOW | Keep |
| Search results previews/metadata | Suggestion avatars; channel result hero | Avatar/text result grid only | Weak | HIGH | P0 |
| Search recent channels | Yes | Only History tab | Missing | MEDIUM | P0 |
| Search URL/state preservation | Channel query links; tab state memory | Hash Search but query absent | Weak | HIGH | P0 |
| Search mobile keyboard hints | enterkeyhint and autocapitalize off | Missing hints, Latin-only dir | Weak | MEDIUM | P0 |
| Search localized errors and cancellation | Partial, suggestions silently fail | Yes, bounded abort and localized states | Ahead in error specificity | LOW | Keep |
| Channel live hero/preview | Yes | Avatar/text, no hero preview | Weak | HIGH | P0 |
| Channel avatar/name/login/title/game | Yes | Yes | Present | LOW | Keep |
| Channel viewers/uptime refresh | Yes, minute refresh and ticking clock | Uptime only | Weak | MEDIUM | P0 |
| Channel offline age | Estimated from last broadcast | No | Missing | MEDIUM | P0 where metadata supports estimate |
| Channel device save action | Yes, local follow | No | Missing | HIGH | P0 |
| Channel Twitch follow mutation | Not proven; local follow is distinct | No | No confirmed reference capability | LOW | Do not claim |
| Channel media tabs | Broadcasts/deleted/highlights/playlists/clips | Two stacked sections | Weak | HIGH | P0 |
| Channel broadcasts thumbnails | Yes | No | Missing | HIGH | P0 |
| Channel broadcast keyword/date filter | Yes | No | Missing | MEDIUM | P0 |
| Channel more broadcasts | Worker full list | Six only | Weak | HIGH | P0 pagination |
| Channel highlights | Yes, GQL | No | Missing | MEDIUM | P0 Helix highlight type |
| Channel playlists/collections | Yes, GQL | No, no documented Helix collection endpoint | Missing | MEDIUM | Future own adapter; no fake tab |
| Channel clips thumbnails | Yes | No | Missing | HIGH | P0 |
| Channel clip period filter | 24h/7d/30d/all | All-time six only | Weak | MEDIUM | P0 |
| Channel in-app clip playback | Yes, video and replay | External links only | Missing | HIGH | P1/P2 |
| Channel deleted/Past Streams discovery | Recovery tab/backend | No | Missing | HIGH | P3 |
| Channel integrated live watch action | Yes | Open Twitch externally | Missing | CRITICAL | P1 |
| Live playback | Yes, HLS/Worker | No | Missing | CRITICAL | P1 |
| VOD playback | Yes, HLS/Worker | No | Missing | CRITICAL | P1 |
| Quality selector | Yes | No | Missing | HIGH | P1 |
| Auto quality/active bitrate | Yes | No | Missing | HIGH | P1 |
| Playback speed | Yes | No | Missing | MEDIUM | P1 |
| Seek/buffer/progress | Yes, custom track | No | Missing | HIGH | P1 |
| Seek plus/minus ten seconds | Yes, keys and double tap | No | Missing | MEDIUM | P1 |
| Volume/mute | Yes | No | Missing | HIGH | P1 |
| Fullscreen with chat | Yes, Safari fallback | No | Missing | HIGH | P1/P2 |
| Picture in Picture | Yes, standard and WebKit API | No | Missing | HIGH | P1 |
| Back to live/latency | Yes | No | Missing | HIGH | P1 |
| Theatre mode | Yes | No | Missing | MEDIUM | P1 |
| Mini-player while browsing | Yes | No | Missing | HIGH | P1 |
| Player loading/reconnect/errors | Yes, fallback/ended/retry | No player | Missing | HIGH | P1 |
| Resume VOD/progress | Yes | No | Missing | HIGH | P1 |
| VOD game chapters | Yes | No | Missing | MEDIUM | P1 later |
| Player keyboard shortcuts/help | Yes | No | Missing | MEDIUM | P1 |
| Mobile native HLS/PiP/fullscreen fallback | Yes, source implementation | No player | Missing | HIGH | P1 physical Safari QA |
| Paste URL / ID entry | Yes, dedicated Link / ID tab for live/VOD/clip | No | Missing | MEDIUM | P1 with player |
| External player/link/M3U | VLC/Outplayer/Infuse/copy/M3U | Open Twitch only | Missing | MEDIUM | P4 |
| Live IRC chat | Yes | No | Missing | CRITICAL | P2 |
| Username colors/badges | Yes | No | Missing | HIGH | P2 |
| Twitch/BTTV/FFZ/7TV emotes | Yes | No | Missing | HIGH | P2 |
| Chat replies/mentions/autocomplete | Yes | No | Missing | HIGH | P2 |
| Pinned messages/announcements | Yes | No | Missing | MEDIUM | P2 |
| Predictions/read-only raids | Yes, Hermes; auto-raid preference | No | Missing | MEDIUM | P2 |
| Deletion/moderation display | Yes; not a moderator dashboard | No | Missing | MEDIUM | P2 |
| Sending chat messages | Yes, account chat permissions | No | Missing | HIGH | P2 permissions |
| Recent-message bootstrap | Yes, external service | No | Missing | HIGH | P2 own approved integration |
| VOD/clip chat replay | Yes | No | Missing | HIGH | P2 |
| Chat filters/timestamps/font size | Yes | No | Missing | MEDIUM | P2/P4 |
| Chat paused scroll/new-message button | Yes | No | Missing | MEDIUM | P2 |
| Arabic-safe chat isolation | No Arabic UI; no explicit bidi isolation found | No chat yet; page RTL works | Future requirement | HIGH | P2 first class |
| History recent channel visits | Yes, 30 mixed entries | Yes, 50 channel entries | Present | LOW | Keep |
| History playback position/Continue Watching | Yes | No | Missing | HIGH | P1 |
| History local anonymous persistence | Yes | Yes | Present | LOW | Keep |
| History cloud account/native sync | Yes, own authenticated Worker | No | Missing | MEDIUM | P4 own backend only |
| History dates/clear/storage fallback | Yes/partial storage guards | Yes, quota fallback/cross-tab | Present | LOW | Keep |
| Persistent mobile bottom navigation | Yes, four tabs | No, top row scrolls away | Missing | HIGH | P0 |
| Desktop sticky navigation | Yes | No | Missing | HIGH | P0 |
| Channel/search/category deep links | Watch query links; ordinary tabs not fully routed | Channel hash; no search/category state | Weak | HIGH | P0 |
| Back/Forward route stack | replaceState watch URLs, no popstate handler found | Hash navigation but every visit reloads | Weak in both | HIGH | P0 improve beyond reference |
| Tab state/cache retention | 90s/120s caches | Search memory, Home/channel clear/refetch | Weak | HIGH | P0 |
| Scroll restoration | setTab always scrolls top | No explicit per-route restoration | Weak in both | MEDIUM | P0 |
| Settings language | FR/EN/ES/auto | EN/AR/device first visit shared About | Ahead for target audience | LOW | Keep |
| Settings player/chat options | Extensive actual controls | No player/chat settings | Missing with feature dependencies | MEDIUM | P1/P2/P4 |
| Settings history/account controls | Export/import/account/sync | Clear visits/logout | Partial | MEDIUM | P4 |
| Settings privacy/usage counts | Telemetry opt-out/stats | No telemetry | Ahead in minimal collection | LOW | Keep no copied analytics |
| Settings onboarding/changelog | Tour/changelog | No | Missing | LOW | P4 after core tasks |
| Account header/avatar/logout | Yes | Yes | Present | LOW | Keep |
| Account followed channels | Yes, user read follows scope | No extra scopes requested | Missing | HIGH | Optional consent follow-up |
| Account expiry/revalidation | Validation at adoption, logout on failure | Startup/hourly/Helix401/expiry | Present; own implementation stronger schedule | LOW | Keep |
| Account credential lifetime | Token in localStorage | Token in sessionStorage; no refresh retained | Ahead in persistence risk | LOW | Keep |
| Account browser-safe public flow | Reference implicit flow/state | Working own public Device Code flow | Ahead for own public client | LOW | Never replace configuration |
| Responsive/safe areas | Bottom bar/landscape/overlay | Safe page padding/no persistent bar | Weak | HIGH | P0 shell; P1 player |
| Mobile controls minimum target size | Some sm/xs controls below44 | Existing validation all primary >=44 | Ahead baseline | LOW | Preserve |
| Desktop grid/density | Wide auto-fill cards/player chat split | 960px frame, repeated large hero | Weak | HIGH | P0 |
| Lazy previews/images | Yes | Avatars eager, no previews | Weak | MEDIUM | P0 |
| Bounded lists/chat nodes | Pagination, MAX_NODES300 | Small fixed lists; no chat | Partial | MEDIUM | P0 pagination/P2 caps |
| Startup weight | Many imported chat/player modules plus eager HLS | Nine small scripts, no media runtime | Ahead | LOW | Keep modular/lazy later |
| Service worker/PWA | Own root-scoped PWA | No app worker, protects root SW | Intentional difference | LOW | Future app-only scope |
| Keyboard/focus landmarks | Mixed: focus-visible; custom controls gaps | Skip link/landmarks/visible focus | Ahead baseline | LOW | Preserve and improve |
| Reduced motion | CSS motion reduction | CSS motion reduction | Present | LOW | Keep |
| Arabic translation/page bidi | FR/EN/ES; Arabic stream filter only | Complete EN/AR, dir and technical isolation | Ahead | LOW | Authoritative |

Checklist: **108 criteria**, reference **104 supported/partial**, own baseline **44 supported/partial**; severity counts **{'CRITICAL': 4, 'HIGH': 49, 'MEDIUM': 31, 'LOW': 24}**. A partial criterion is not full parity.


## 3. Home comparison

**Observed:** reference Top streams loads without login, with 24 thumbnail cards, live badge, counts, uptime, title, avatar and game. The default Following segment initially needs sign-in or device follows; it is not automatically a full personalized feed. Categories separately shows about 40 game tiles. Own baseline logged out repeats the sign-in requirement twice beneath a large product hero; signed in it loads 12 avatar/text cards. Reference local/world filters are discovery controls, not proven recommendation AI.

Reference `main.js:392–446,473–750` separates Continue Watching, followed/live/offline, top streams, categories and cached refresh. Own baseline `shell.js:19–29` discards cards on every Home entry. At 390px the duplicated hero/auth copy pushes useful results down; at 1440px the 960px container prevents the same breadth of cards. Adding thumbnails is valuable because a stream title often describes an event rather than its visual content. Add recent/saved sections, category selection, language-filtered discovery, stable initial skeletons and stale-while-refresh content. Do not ship a fake Continue Watching rail without playback.

## 4. Search comparison

**Observed:** reference “Streamer” input returns seven suggestions for `ninja`, including names, avatars and live count. Enter submits an exact channel and exposes its hero/media immediately. `main.js:1007–1057` combines device history and remote matches, sequence guards, arrows, Enter and Escape. Own search combines documented search plus exact users lookup, so older offline channels can be found, but it is visually a labeled input, submit button, checkbox and unadorned result grid. It has no suggestions or recent entry points, query is absent from URL and mobile autocapitalization/return-key hints are absent.

P0 should provide a search landmark, inline debounced combobox, keyboard selection, visible result count, thumbnail-led results, quick recent/saved channels, exact-name fallback, instant live-only resubmission and a shareable submitted-query hash. Keep friendly localized timeout/429/malformed errors. Abort old queries and prevent an older suggestion response from reopening the list after choosing a result. Suggestions must not fire during IME composition. Dismiss on Escape/blur, retain query on Back, and never insert API text as HTML.

## 5. Channel comparison

**Observed:** reference Ninja page has a large avatar/live ring, login, local follow button, preview, live title/game/viewers/uptime and Watch live. Its tabs are Past broadcasts, Deleted, Highlights, Playlists and Clips; many broadcasts include thumbnails/durations/dates and a keyword/date filter. Offline age is an estimate from last broadcast metadata. Clips have 24h/week/month/all filters. Source `main.js:1090–1328` implements lazy tab loaders and `api.js:472–533` uses GQL collections/highlights/clips.

Own baseline exposes avatar, login, live/offline, title/game/viewers/uptime, description, external Twitch link, six archives and six clips in vertically stacked text sections. It lacks preview, save/follow distinction, tabs, highlights, filter, more results, clip period and explicit hierarchy. P0 adds supported Helix media and pagination, with artwork and deliberate external-link labeling. It must not imply external clicks are in-app viewing or completed watching. Playlist and deleted/recovery parity remain gaps. Do not infer channel last-live age from account creation; if archive-derived estimates are used, label them estimates.

## 6. Player comparison

Reference `player.js` includes HLS.js, native HLS fallback, quality/Auto and actual bitrate, rate menus, buffer/seek, ten-second buttons/mobile double tap, volume/mute, fullscreen (video/chat container plus Safari fallback), standard/WebKit PiP, back-to-live and latency, theatre, chapter markers, shortcuts and controls hiding. `main.js:1329–1832` manages live/VOD/clip watch overlays, mini-player continuity, stream-ended/raid transitions, reconnect errors, external players and resume. `store.js` persists per-VOD progress and known lengths. The README claims these features; source supports them. Audit playback checks are recorded below rather than assuming every CDN/quality path works.

Own baseline has **no video element/player runtime**. All listed controls, decoding, stall/retry, live edge, gesture/autoplay handling, audio state, playback resume, progress/Continue Watching, keyboard shortcuts, PiP/fullscreen and Safari-specific controls are absent. This is CRITICAL and intentionally untouched by P0. P1 needs an owned media-delivery decision before UI: documented Twitch embeds versus a supported owned delivery adapter, not the reference Worker. Lazy-load the playback module after explicit watch action; honor Safari user gesture, native HLS/PiP/fullscreen capability detection, reduced motion, seek accessibility and safe-area landscape controls. Physical iPhone testing is mandatory before claiming parity.

## 7. Chat comparison

Reference source `chat/irc.js` connects Twitch IRC WebSocket; `live.js` loads recent messages and connects identity; `emotes.js` integrates Twitch/BTTV/FFZ/7TV; `badges.js` supplies badges; `message.js` renders colored users/replies/mentions; `pinned.js` and Hermes cover pins, announcements, predictions, raids; `vod.js` replays time-synchronized messages. `view.js` includes send/reply, autocomplete, picker/user card, highlighted/muted words, bot/command/user filters, timestamps/font size, scroll pause/new messages, and deletion display. This is not evidence of full moderator tools or editable predictions. Displaying moderation events is distinct from moderation authority.

Own has no chat transport, message model, rendering or permissions. Live chat is CRITICAL and other chat rows HIGH/MEDIUM. P2 must build a bounded accessible log and first-class Arabic mixed-direction messages: body `dir=auto`, isolated LTR username/emote IDs/time, URLs isolated, logical alignment, no manual text reversal, readable username colors. Reference does not have Arabic UI or explicit bidi isolation in inspected message paths. Keep OAuth scopes opt-in; never introduce chat permissions just to browse. Source caps message nodes at 300 (with relaxed bounds while paused) and internal message arrays around 600; adopt the concept, not the implementation or third-party IDs.

## 8. History comparison

Reference `store.js:47–137` stores 30 mixed channel/VOD entries, individual progress keys and duration map. Continue Watching cards show time/progress and reopen VODs at saved position; account sync is its own token-validated Worker and native-compatible formats. Anonymous history remains local. Own History correctly stores 50 unique recently opened channels with avatar/display name/opened timestamp, quota fallback and cross-tab refresh. That is visit history, not watch history. External VOD links do not provide playback position. P0 surfaces visits where discovery happens; P1 adds progress/checkpoints and removal/clear choices, P4 only adds a new owned sync layer. Never copy its cloud endpoint or pretend local device saves are Twitch follows.

## 9. Navigation / app feel comparison

Reference has desktop top navigation and mobile persistent four-tab bottom bar, compact account/settings actions, category browsing and watch overlay/mini-player. Existing tabs retain state and use 90s/120s data ages. However `setTab` scrolls to top; `setUrl` uses replaceState and no popstate route controller was found. Watch deep links use `?channel`, `?id`/`?vod`, `?clip`. It is not a model of complete browser Back/Forward semantics.

Own baseline hashes support four tabs and channel login, but Home/channel discard state and re-fetch every visit, query/tab/category is not routed and scroll position is not remembered. A repeated product hero behaves like a landing page. P0 can do better than both: simple hash route parser, submitted query/category/media-tab parameters, actual browser history, panel caches with explicit refresh, per-route scroll positions and focus to heading only for purposeful navigation. Safe sticky desktop nav and fixed mobile bar need content bottom padding. Cancel obsolete work, restore on Back without clearing cards, and preserve input/media filters while refreshing translated labels.

## 10. Settings and login/account comparison

Reference observed settings: device/FR/EN/ES language, top-stream language (including Arabic streams, not Arabic UI), grid/list, click-to-pause; chat/video sync, auto-raids, timestamps, retain deleted messages, earlier messages, hide bots/commands, muted/highlight words, hidden users, chat size; export/import, account/sync, usage sharing/statistics, About/source/Discord, changelog/tour. Player controls additionally retain quality/volume/mute/theatre/chat-open. No comprehensive theme chooser was found. External-player choice is in the watch sheet, not necessarily a permanent preference.

Own settings currently offers EN/AR, clear channel visits and logout. Adding disabled player/chat settings now would be meaningless; retain simple useful settings and defer dependent controls. P0 may expose saved-channel clearing and discovery choices. Reference account header uses Twitch avatar/display name/log-out and follows; own already has those identity basics plus proven token validation. Reference persists token in localStorage and uses implicit state/redirect/popup; own uses working public-client Device Code flow and sessionStorage with startup/hourly validation. Preserve own Client ID and redirect unchanged. Followed channels require new optional scope and are distinct from local saves. Expired sessions should retain local visits/saves and prompt sign-in without losing route/query.

## 11. Mobile comparison

Automated Chromium/WebKit at **320/375/390/430px**, plus source safe-area/landscape inspection: neither baseline showed horizontal overflow in initial logged-out Home. Reference mobile nav is fixed, content bottom padding includes safe area, channel preview and stream images establish hierarchy, settings opens a sheet and watch portrait stacks video/info/chat; landscape source splits video/chat and moves controls. At 320px repeated small buttons/settings text are dense, and xs/sm buttons can fall below the requested 44px. Onboarding blocks initial discovery until skipped. The baseline offers good 44px controls/RTL but navigation scrolls away, repeated header/hero takes too much first-screen height and no media preview exists.

P0 uses five equal bottom-nav cells without wrapping into another row; logical padding includes iOS insets and text must fit naturally in Arabic. Search uses 16px input to avoid Safari focus zoom, `enterkeyhint=search`, no unwanted capitalization and natural `dir=auto` query. Hide neither results nor focused input behind fixed nav. Test portrait and a 844×390 landscape viewport; keyboard viewport/safe-area values from desktop WebKit cannot substitute for real iOS Safari keyboard/PiP/rotation QA. Player/chat mobile work remains P1/P2.

## 12. Desktop comparison

At **1440px**, original uses wider auto-fill thumbnails and separate category grids; watch source supports video/chat split and theatre. Own centered 960px/three columns plus hero leaves excessive side margins and redundant identity above every tab. P0 expands only the app to a restrained 1200px workspace, four stream columns, compact title/section controls, and dense horizontal recent/saved items. About retains its original width. A permanent desktop sidebar is an option after followed/library content exists, not mandatory framework overhead. The player/chat split belongs to P1/P2, not a decorative empty column now.

## 13. Performance comparison

Measured source bytes (unminified): reference JS modules sum 325.8KB, CSS 68.5KB, plus external HLS runtime and fonts; `main.js` alone 105.7KB and chat view 45.3KB. Own baseline JS 63.7KB, CSS 11.7KB, with shared 26.ttf. Browser initial resource counts: reference 24 versus own 12. Chromium Resource Timing summed encoded bodies about 249KB reference / 209KB own; cross-origin timing restrictions mean these are **not complete network transfer totals** and cannot prove a speed ratio. Reference statically imports chat/player modules and eagerly calls `loadHls()` at boot, even before playback. It lazy-loads card images; own avatars are eager and no preview exists. The custom font contributes appreciable initial transfer; preserve one shared resource, no font duplication.

Own baseline Home is two Helix calls plus profile; search up to three, channel profile three plus two media endpoints. Reentering routes repeats them. Reference has many service endpoints, cached view data and periodic updates. P0 adds images/categories but controls load: fixed-size lazy thumbnails, batch users/streams, bounded TTL caches, debounced/cancelled suggestions, only media tab data needed, cursor paging instead of enormous lists and DOM updates only where useful. No HLS/chat library or framework gets added. A stylesheet and small i18n script remain render-blocking; split About dictionaries only if real measurements justify compatibility risk. No app service worker is needed; future scope must be `/twitchunblock/`, never root/APT.

## 14. Accessibility comparison

Own baseline has skip link, landmarks, translated labels, visible gold focus, correct HTML lang/dir, technical bdi isolation, reduced-motion CSS and previously validated 44px primary controls. Reference includes focus-visible styling, dialog roles, chat role=log and translated titles, but suggestions are button lists without complete combobox semantics, several player labels are hardcoded English, custom seek lacks an obvious native range equivalent, and some interactive preview/card elements depend on delegated clicks. Settings sheet source did not establish a complete focus trap/restore implementation. These are audit findings, not a spoken screen-reader pass.

P0 needs an accessible combobox/listbox with active descendant, keyboard tabs/media controls, current-page indication, text result announcements (avoid announcing whole grids), real links for thumbnails, directional logical properties, skeleton aria-hidden plus concise busy status, no Arabic clipping, visible focus and 44px minimum controls. Test the accessibility tree and keyboard behavior in both engines; record physical VoiceOver as untested. Gold design/26.ttf remain authoritative. User-generated titles/categories use auto direction; usernames/URLs/IDs remain isolated LTR.

## 15. Missing features

Major missing layers: owned in-app live/VOD/clip playback; chat/replay and emote/badge model; progress/Continue Watching; categories and category streams; saved/followed channels; suggestions; channel media artwork/tabs/highlights/filter/pagination; persistent mobile navigation and stateful search/deep links; playlists; deleted/Past Streams and Recovery; account synchronization and export/import. The matrix enumerates smaller dependent controls. Missing player/chat makes a watching parity claim false even after P0.

## 16. Weak existing features

Home has real data but poor discovery hierarchy, eager text clearing and stale viewer counts. Search has robust APIs but a generic form and no suggestion/return path. Channel has correct metadata but six text links per media kind and a refresh button that discards useful state. History is reliable yet disconnected from Home/Search. Navigation uses real hashes but has no route query/media state or scroll restoration. Settings is deliberately small rather than broken; advanced settings should follow working capabilities.

## 17. UX problems in the current site

1. Logged-out first screen duplicates a sign-in message instead of showing a useful entry path and local return items.
2. The same large marketing hero appears on channel, search, history and settings, forcing extra scrolling.
3. Identically styled card text hides the visual distinction between discovery result, live channel and recent visit.
4. Mobile nav disappears when most needed; desktop has excess margins.
5. Back to Search discards context because submitted query isn't a URL; repeated navigation clears live content.
6. VOD/clip text links lack artwork, duration hierarchy and explicit “opens Twitch” context.
7. Refresh and language switching rebuild content without deliberate state/focus preservation.
8. A list of popular channels is not personal/followed/recommended content and should be labeled accurately.

## 18. Things the original does better

Its browsing hierarchy maps to real tasks: see what is live, return to known creators, explore games, find a channel quickly, switch media types and watch with chat. Thumbnails carry information, badges/counts are readable at a glance, cached views return immediately, live states refresh, and bottom navigation is thumb-accessible. Playback/mini-player and progress create continuity. Media archives, highlights, collections and clips are separated rather than a long mixed wall. Source and live checks establish these concepts without requiring us to adopt its purple styling or backend.

## 19. Things this site already does better

Arabic UI/RTL is first-class and shared with About, unlike the reference's FR/EN/ES UI. Theme and 26.ttf match ipapplus. Documented Helix boundaries are explicit; own client/session are not borrowed. Session credentials have shorter persistence, error strings are localized and API data rendered safely. Root-site/APT/service-worker isolation is deliberate. The native project landing/release download survives as a separate About route. Primary controls/focus/reduced-motion are more consistent, and the shipped discovery code is much smaller. These are safeguards to preserve, not excuses for the product gap.

## 20. Recommended architecture

Keep plain HTML/CSS/JS. `config.js`/`auth.js` are unchanged ownership boundaries. Extend `twitch-api.js` for safe optional thumbnail fields, top games, game/language stream filters, highlights, dated clips and cursor-based archives. Use batch user/stream enrichment and AbortSignal. Separate Home controller, shared bounded discovery cache and device-saved channel store from Search and Channel. The router parses `#home`, `#category/id`, `#search?q=...&live=1`, `#channel/login?tab=...`, History/Settings; state/scroll belong to route controllers, not a large global re-render.

DOM helpers render safe media/stream cards with declared image dimensions/lazy decoding, compact saved/recent entries, stable skeletons and translated statuses. Continue shared i18n/localStorage key. Scope app-specific layout under `.web-app` so About retains its style. Device saves use a new noncredential browser key, distinct from OAuth/session and visit history. No copied app IDs/Worker/D1/admin/analytics settings. No framework or new worker. Future player module lazy-loads on watch; chat separately lazy-loads when opened; future backend must be independently configured and token-authorized.

## 21. Prioritized implementation roadmap

| Phase | Deliverable | Exit criteria / dependencies |
|---|---|---|
| P0 approved now | Thumbnail Home, categories/drill-down, recent/device-saved channels, skeletons/cache refresh; debounced accessible Search; channel hero/tabs/highlights/media artwork/filter/paging; sticky/bottom nav, routed queries/tabs and Back scroll | Real owned Helix where possible; EN/AR and both engines at all five widths; no root/About/auth config regressions |
| P0 follow-up permission | Optional account-followed streams; fuller category search/pagination if demanded | Explicit `user:read:follows` consent, accurate empty/scope-denied state; no forced permission expansion |
| P1 | Real live/VOD/clip player, quality/Auto, native Safari behavior, PiP/fullscreen, progress/Continue Watching, mini-player | Decide owned media delivery first; lazy runtime; physical iPhone and accessible seek/keys |
| P2 | Live/replay chat, badges/emotes, replies/filters/recent messages, Arabic bidi | Scope consent for sending; bounded nodes, approved service integrations, bidi and screen-reader QA |
| P3 | Past Streams/archive/Recovery | Separately owned backend/provenance and availability model; do not modify native Worker/D1 |
| P4 | Sync/export/import, advanced preferences, optional PWA, polish | Own authenticated sync and strict app-only worker scope; no copied telemetry |

P0 is implementation-authorized by the user after this audit, not a request for a whole-app rewrite. No player, chat or Recovery is implemented in this phase.

## Browser evidence and validation record

Initial live-site audit: both browsers at all five requested widths; reference Welcome/default Following and own logged-out Home screenshots in `audit/`. Reference Top/categories/Ninja/suggestions/settings were functionally exercised without authorizing its OAuth app. Own baseline real authenticated screenshots are separate from logged-out shots. PNGs are evidence, not application dependencies. Source-only account sync/advanced settings are not claimed as live authenticated tests. Playback and final P0 test outcomes are recorded after implementation below.

### Reference playback observation

Reference live playback was successful in Chromium: video readyState 4,
currentTime 16.02s and playing, with 82 chat rows. WebKit reported “This live is
unavailable”, readyState 0 / paused at time 0, while 89 real chat rows loaded.
Successful Chromium playback is observed; WebKit playback parity is not proven.
Remote CDN/Worker/browser availability is a real failure path, not a reason to
copy the backend. Discovery and channel media worked in both engines.
The checklist excludes unproven algorithmic personalization, Twitch follow
mutation and Arabic-specific capabilities from the reference supported count.

### Detailed reference viewport observations

`audit/reference-observations.json` records Top and channel checks in both engines
at 320/375/390/430/1440, all without horizontal overflow. Top contained 24 cards.
The mobile bar displayed at the four phone widths and hid at 1440. The visible
Top page had 11 controls below 44px on phone widths and 15 on desktop (including
small links/buttons); this count does not by itself establish which controls
violate WCAG, but shows why we keep 44px targets. Keyboard suggestion selection
was exercised on the reference. Physical iPhone, sign-in to the reference app,
full account sync, every quality/player setting and spoken VoiceOver remain
untested. Screenshot evidence and source evidence are distinguished throughout.

## P0 implementation outcome

The audit was written before implementation. P0 is an original implementation
within the existing ipapplus design and documented Helix adapter.

| Area | Baseline → implemented P0 | Remaining gap |
|---|---|---|
| Home | Text/avatars → lazy 16:9 previews, category tiles/drill-down, Live/Saved/Categories segments, recent creators, stream-language preference, stable skeletons and retained refresh cards | Anonymous server-backed discovery, account Twitch follows and Continue Watching |
| Search | Submit-only form → 300ms cancellable local/remote combobox, keyboard/VoiceOver-friendly semantics, results count, preview cards, recent shortcuts, submitted query/live filter URL and reload restoration | Category search and advanced discovery filters |
| Channel | Stacked six text links → preview hero, device-save action, category link, explicit external watching, archive/highlight/clip tabs, artwork/dates/duration, loaded-title/date filter, cursor paging, clip periods | Collections, deleted streams, integrated watch/chat |
| Navigation | Scroll-away bar/refetch → fixed safe-area mobile nav, sticky desktop nav, wider four-column workspace, route cache, Back/Forward and scroll/state preservation | Persistent playback/mini-player (P1) |
| Accessibility | Existing RTL/focus → proper combobox and tabs, selected states, translated new labels, save/refresh focus preservation, active selection retained during remote merge | Physical VoiceOver/iPhone testing |
| Runtime | 63.7KB JS → approximately 89KB modular JS, no framework/HLS/chat libraries | Future lazy player/chat architecture |

The fixed checklist moves from **44 to 59 supported/partial own criteria**
(reference **104**). Fifteen formerly missing criteria now have support; other
P0 work strengthens existing partial criteria rather than inflating this count.
This is browsing improvement, not player/chat parity: all four CRITICAL baseline
criteria remain for P1/P2. Baseline 49 HIGH gaps include many newly improved P0
criteria; remaining high examples are real playback controls, Continue Watching,
IRC/emotes/replay, account follows, anonymous discovery and historical media.
The baseline matrix is retained so that the original gap stays reviewable.

Own Client ID/config, OAuth redirect and auth implementation were not changed.
About document/release controller, root files/APT resources and the reference
clone remain unchanged. Shared stylesheet additions are app-scoped; 26.ttf is
still loaded once from the root resource. No service worker, backend or copied
reference infrastructure/configuration was added.

Validation uses real owned OAuth/Helix separately from mock failure fixtures.
The mocked suite covers all five widths in EN/AR, APIs/errors, combobox, media
tabs/highlights/clip dates, history/settings/privacy, keyboard/focus, font and
no overflow. Dedicated P0 mocks verify TTL return/refresh without card/focus
loss, query reload, lazy media, pagination/filtering and media Back/Forward.
WebKit fixture processes are isolated because this Linux WPE runtime closed
during repeated context churn; the system log confirmed occasional native
`libWPEWebKit` segmentation faults in reruns, including isolated fixtures.
The full matrix/failure suite passed on an earlier run; final dedicated P0
regressions and real checks passed in both engines. Real checks use a single
continuous session. This Linux runtime caveat is not physical Safari evidence.
About/release/API/IPA/root worker/byte-parity regression suites passed in both
engines. Expiry advances local session time; logout token revocation verifies a
real Twitch validation 401, not a mock or hours-long natural expiry wait.

P0 media remains external links explicitly labeled “Opens on Twitch”; no watch
progress is fabricated from a click. Saved channels use device storage, not a
Twitch follow mutation. Highlight/clip empty states report actual availability.
All references to device language retain the one shared UI-language key; the
separate stream-language preference filters content and does not change UI lang.

### Before/after screenshot index

All paired own screenshots use real Twitch metadata. Live counts/titles change
between capture times; these are product/layout comparisons, not fixture clones.
Before captures are full-page and after captures are the visible viewport;
compare the first screen when assessing density. Screenshot browser automation
is desktop Chromium/WebKit, not a physical phone.

| View | Before | After |
|---|---|---|
| Home, English, 390 | [Before](audit/before-real-home-en-390.png) | [After](audit/after-chromium-home-en-390.png) |
| Home, Arabic, 390 | [Before](audit/before-real-home-ar-390.png) | [After](audit/after-chromium-home-ar-390.png) |
| Home, English, 1440 | [Before](audit/before-real-home-en-1440.png) | [After](audit/after-chromium-home-en-1440.png) |
| Search, English, 390 | [Before](audit/before-real-search-en-390.png) | [After](audit/after-chromium-search-en-390.png) |
| Ninja channel, English, 390 | [Before](audit/before-real-channel-ninja-en-390.png) | [After](audit/after-chromium-channel-ninja-en-390.png) |
| Ninja channel, Arabic, 390 | [Before](audit/before-real-channel-ninja-ar-390.png) | [After](audit/after-chromium-channel-ninja-ar-390.png) |

Reference compact [Home](audit/reference-detail-chromium-home-390.png),
[desktop Home](audit/reference-detail-chromium-home-1440.png),
[Chromium player/chat](audit/reference-detail-chromium-player-390.png),
[WebKit player/chat failure](audit/reference-detail-webkit-player-390.png),
and [settings](audit/reference-chromium-settings.png) show the UX comparisons.
Other selected WebKit/bilingual screenshots remain in `audit/`. Long raw
reference scrolling captures were inspected but kept outside the repository to
avoid shipping redundant megabytes with the app.

### Final local real-data validation

Chromium and WebKit both passed owned Twitch login/token validation, 12 Home
live channels, categories and category streams, device saves, keyboard
suggestions, exact lookup, live/offline profiles, 12 VOD links and 12 clip
links, highlight availability/empty states, dated clip requests, browser Back
scroll restoration, reload persistence, local expiry simulation and real logout
revocation (validation HTTP 401). Six app views were checked in English and
Arabic at 320/375/390/430/1440, with no horizontal overflow. Dedicated P0 mocked
regressions also passed both engines, including normal-motion Back restoration
and Arabic landscape. Rate limits, malformed data and timeouts are mocked
failure tests, not deliberately induced production Twitch failures.
