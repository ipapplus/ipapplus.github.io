# TwitchUnblock project page

Public URL: https://ipapplus.github.io/twitchunblock/

Static HTML, CSS and JavaScript, served by the existing GitHub Pages deployment
from `main` at the repository root. No build step, backend, credentials, analytics,
manifest or service-worker registration is added. The homepage stays unchanged.

The visual tokens, font stack and motion timings follow the root `website.css`.
`/26.ttf` is the original root font, loaded without changing or duplicating it.
The app icon comes from `ipapplus/TwitchUnblock/assets/icon.png`. The project-specific
1200×630 social preview uses the same font and site palette.

Release metadata comes from the unauthenticated GitHub API:
`https://api.github.com/repos/ipapplus/TwitchUnblock/releases/latest`.
Download links use `browser_download_url` from uploaded release assets. Prefer
`TwitchUnblock.ipa`; accept a single versioned TwitchUnblock IPA, otherwise link
to the release instead of choosing an ambiguous asset. Errors and the 10-second
timeout fall back to GitHub Releases. No version or IPA URL is pinned.

Release ages use completed elapsed minutes, hours, days, weeks, approximate
30-day months and 365-day years; under 60 seconds says “Just now”. The exact date
uses the browser timezone. One minute timer refreshes age while the page is
visible; it stops on hiding or leaving. It does not refetch the API periodically.

## Root-site isolation

The existing root worker has scope `/` and can control this subpath when already
installed. Its fetch handler passes HTML navigation, scripts, project images,
release requests and APT resources through to the network. Only its existing
branding/font allowlist is cached; using the cached root font is intentional.
This page imports none of the root PWA/navigation scripts and installs no worker.
It does not claim a new scope or modify root caches. Back to ipapplus is a normal
navigation. `Packages`, `Release`, and the root site's files remain unchanged.

## Validation

Serve the repository root:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

With Node 20+ and Playwright/Chromium/WebKit installed in a separate directory:

```sh
PLAYWRIGHT_MODULE=/path/to/node_modules/playwright node twitchunblock/tests/validate.cjs
```

Tests use fixed reference dates and intercepted GitHub responses. They cover
phone and desktop layouts, overflow, the local font, RTL sample, touch targets,
keyboard focus, exact/relative dates, minute refresh, IPA selection, API failures,
malformed and ambiguous assets, timeout, safe text rendering, reduced motion,
and root-worker pass-through. `SITE_URL` and `SCREENSHOT_DIR` are optional.

WebKit automation is a compatibility check, not a physical iPhone Safari test.
Check actual notch safe areas and VoiceOver on an iPhone after deployment.

## Attribution

Original native project: https://github.com/MXFia19/TwitchUnblock
Fork: https://github.com/ipapplus/TwitchUnblock
Maintained by Ahmed AlGhrbi / ipapplus. The native project's MIT license and
upstream credits remain with that project.

The upstream browser project (`MXFia19/TwitchUnblock-Web`) informed the simple
static structure, feature grouping and distinction between native app and browser
product. Its styling, typography, wording, player, authentication, analytics and
backend were not copied. Visual design follows the ipapplus site.
