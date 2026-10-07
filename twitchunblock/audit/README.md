# Audit evidence

See [REFERENCE_GAP_ANALYSIS.md](../REFERENCE_GAP_ANALYSIS.md) for the feature
matrix, source attribution, before/after pairs and implementation roadmap.

- `before-real-*`: the existing app, authenticated against the owner's Twitch
  application, before P0. Full-page Chromium captures.
- `after-{chromium,webkit}-*`: deployed P0 with real OAuth and Helix responses, in English
  and Arabic at 390 and 1440px. Viewport captures. Channel names, viewers and
  stream availability naturally vary over time. `channel-ninja` pairs with the
  baseline; `channel-live` captures a currently live channel.
- `before-{chromium,webkit}-*`: logged-out baseline at mobile/desktop sizes.
- `reference-*`: the public reference, including onboarding/settings and the
  observed player/chat outcome. No authorization of the reference OAuth app.
- `reference-observations.json`: reference Home/channel viewport measurements.

These are evidence files, not downloaded by the application. No authorization
codes, access tokens, cookies or client secrets are recorded here. Desktop
WebKit is not a physical iPhone or a spoken VoiceOver test.

Reproducible suites are in `../tests/`: `validate.cjs` (About/root regression),
`phase2.cjs` (mocked API/error and bilingual viewport checks), `p0.cjs` (mocked
cache/navigation/media regressions), and `live.cjs` (real OAuth/Helix). The real
suite requires approval through the owner's Twitch account; it contains no
credentials. `LIVE_URL` selects production and `SCREENSHOT_DIR` enables captures.
Local-time expiry simulation and actual logout/revocation are distinguished in
the report. Authentication screenshots/traces are deliberately excluded.
