# TwitchUnblock — Twitch discovery

- https://ipapplus.github.io/twitchunblock/ is the Twitch discovery Web App.
- https://ipapplus.github.io/twitchunblock/about/ preserves the native project landing page.

Plain HTML/CSS/JavaScript; no build step or framework. Home, Search, History and
Settings and channel pages use URL fragments and support direct opening and browser back/forward.
About is a normal document navigation. Phase 2 adds Helix discovery, browser OAuth,
local history and functional settings. There is no player, chat, or Recovery backend.
The About feature descriptions refer to the existing native application.

## Phase 2 modules and setup

Read [OAUTH.md](OAUTH.md) for the exact Client ID location and redirect URI.
No Client ID was found, so the public configuration remains blank and sign-in
stays disabled. Successful live data loading requires configuring the owner's
app and signing in. No borrowed app, bundled access token, or anonymous API
workaround is used.

- `config.js`: public Client ID, production callback, ten-second timeout.
- `auth.js`: OAuth state/callback, sessionStorage token, validation and logout.
- `twitch-api.js`: documented Helix requests, response validation, safe public
  user/stream/channel metadata, search, archive videos and clips.
- `search.js`: submit/filter/loading/results/error states and request cancellation.
- `channel.js`: channel profiles, live/offline metadata, VOD/clip link collections.
- `history.js`: the latest 50 unique opened channels with avatar/name/timestamp
  in localStorage (`twitchunblock.history`); clear action and cross-tab updates.
- `ui.js`: DOM/text rendering, validated image/link output, localized numbers/dates.
- `shell.js`: navigation, live Home, session header, history and settings controls.

Search combines documented Search Channels with an exact-login lookup to find
older offline accounts excluded from Twitch's six-month search index. Stream
queries enrich results with current title/category/viewers/uptime. Home shows
12 top live channels. Channel routes (`#channel/login`) fetch users, streams and
channel details; independent archive-video/clip queries preserve profile content
if one collection fails. VODs/clips open on Twitch; no playback code is added.

Run mocked Phase 2 integration tests:

```sh
PLAYWRIGHT_MODULE=/path/to/node_modules/playwright node twitchunblock/tests/phase2.cjs
```

`ENGINE=chromium` / `ENGINE=webkit`, `SITE_URL`, and `SCREENSHOT_DIR` are optional.
These tests explicitly intercept Twitch endpoints; successful real Twitch API and
OAuth consent testing remains dependent on the owner's application configuration.

## Shared design and localization

Both documents share `style.css`, the original theme tokens and font stack,
`assets/app-icon.png`, `assets/social-preview.png`, and the unchanged root
`/26.ttf`. No font or image is duplicated. Safe-area padding, fluid compact
cards, logical RTL spacing, visible focus, 44px targets and reduced motion are
retained. Only the directional back icon is mirrored in RTL.

`assets/js/i18n.js` contains English and Arabic dictionaries, stable translation
keys, attribute/metadata translations and shared language controls. The one
localStorage key is `twitchunblock.language`. A saved manual preference wins;
otherwise an Arabic browser language selects Arabic, and other languages select
English. Controls apply changes immediately without reload. Storage events keep
open tabs synchronized; pageshow reconciles preferences on restored pages.
Storage-denied browsers still support switching within the current page.

The module sets `html.lang` and `html.dir` before body rendering and updates both
on switching. Technical terms use LTR bidi isolation; release versions/tags and
username input remain LTR. Arabic content otherwise follows natural RTL order.
Static rich-copy translations preserve upstream links; untrusted release API
values are always inserted as text. About includes translated descriptions,
features, credits, labels, loading/fallback states and accessibility metadata.

Relative time uses completed elapsed units, explicit Arabic singular and dual
forms and `Intl.RelativeTimeFormat` for Arabic few/many/plural forms. Under a
minute is “Just now” / “الآن”. Exact dates use localized formatting and the
browser timezone. A visibility-aware minute timer updates age without refetching.

## Release behavior

`app.js` remains the About release controller. It queries
`https://api.github.com/repos/ipapplus/TwitchUnblock/releases/latest` without
credentials. It validates release URLs, dates and asset names, preferring one
uploaded `TwitchUnblock.ipa`, otherwise one unambiguous versioned IPA. Missing or
ambiguous assets link to the release. API errors and the ten-second timeout link
to GitHub Releases. All three download buttons stay synchronized and update
language immediately without changing their destination.

## Root site and future service-worker scope

No root files or APT resources are modified. Neither document loads root PWA
scripts, adds a manifest, or registers a service worker. The existing root worker
continues passing TwitchUnblock documents/scripts/images and APT resources through
to the network; its existing cached `/26.ttf` behavior remains intentional.

If an app worker is introduced later, place it at `/twitchunblock/sw.js` and
register with explicit scope `/twitchunblock/`. Never register a root-scoped
worker or widen scope with a Service-Worker-Allowed header. Use app-specific
cache names and only clean those caches. Root `/`, `/packages.html`, `Packages`
and `Release` must stay outside any app worker control.

## Validation

Serve the repository root with `python3 -m http.server 8765 --bind 127.0.0.1`.
Run with Playwright and browsers installed outside this repository:

```sh
PLAYWRIGHT_MODULE=/path/to/node_modules/playwright node twitchunblock/tests/validate.cjs
```

`SITE_URL` selects a different host; `SCREENSHOT_DIR` saves browser screenshots.
Tests cover Chromium/WebKit at 320, 375, 390, 430 and 1440px in both languages
on both pages, direct opening, switching/persistence/cross-tab synchronization,
font loading, overflow, touch targets, focus, navigation, Arabic relative time,
release/IPA selection and failure cases, reduced motion, root resource byte
parity and root-worker pass-through. WebKit automation is not a physical iPhone
Safari/VoiceOver test; actual device safe areas and spoken labels need device QA.

## Attribution

Original native project: https://github.com/MXFia19/TwitchUnblock
Fork: https://github.com/ipapplus/TwitchUnblock
Maintained by Ahmed AlGhrbi / ipapplus. Existing upstream credits, links, and
native-project MIT license are preserved. The separate upstream browser project
is linked from About. No separate domain is created.

### Phase 1 validation record — 2026-10-07

Chromium and WebKit passed all five requested viewport widths on both documents
in English and Arabic (20 combinations per engine), release refresh/selection,
error/timeout/ambiguous-asset fallbacks, immediate switching, shared persistence,
cross-tab synchronization, touch targets, visible keyboard focus, font loading,
RTL overflow checks and reduced motion. Screenshots were reviewed at 390px.
Local root resource byte comparisons and root-worker isolation checks passed.
The live GitHub API returned `nightly-18`; its IPA asset and View Releases URL
both returned HTTP 200. Production deployment is verified after pushing.

### Phase 2 validation record — 2026-10-07

Chromium and WebKit mocked integration tests passed at 320, 375, 390, 430 and
1440px in English and Arabic. Coverage includes live Home, channel search and
live-only filtering, empty/no-result searches, exact offline lookup, channel
profiles, metadata, VOD/clip links, partial collection failures, history/reload/
clear/storage failure, language persistence, keyboard focus, touch targets, RTL,
font loading, overflow, reduced motion, login/logout, OAuth URL and single-use
state/callback checks, expiry, API timeout/rate-limit/malformed response and 401.
Malicious-looking API text remained literal text. 390px screenshots were reviewed.

The original About/release/IPA/fallback tests and root resource/worker regression
suite passed in both browsers. About documents/assets and protected root files
remain unchanged. The real public homepage returned HTTP 200 before deployment;
a real unauthenticated Helix search returned HTTP 401 (“OAuth token is missing”).
Successful real Twitch search and OAuth consent were **not** tested: the owner's
Client ID is still missing. Mocked results are never used by the deployed app.
Production page/configuration and mocked browser behavior are verified after push.
Physical iPhone Safari and spoken VoiceOver testing remain device QA.
