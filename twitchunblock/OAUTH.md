# Twitch application setup

Production page and OAuth redirect URI:

**https://ipapplus.github.io/twitchunblock/**

Register that exact URI, including the trailing slash, in **your own** Twitch
Developer Console application. No separate `/auth/` document or domain is needed.
OAuth fragments are processed and removed before the normal fragment navigation
starts. Do not use the upstream author's application identifier.

Set the public `clientId` value in:

**`twitchunblock/assets/js/config.js`**

The Client ID is intentionally blank until the owner supplies it. It is a public
identifier, not a secret. Never put a Client Secret, user access token, refresh
token, or other private credential in this repository. After setting the ID,
commit/deploy and perform a real sign-in with the registered redirect URI.

## Why this OAuth flow

Twitch's [current OAuth documentation](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/)
recommends the implicit grant (`response_type=token`) for serverless browser apps.
Its documented authorization-code token exchange requires a client secret and
currently does not document PKCE parameters. GitHub Pages cannot securely perform
that exchange. The implementation therefore uses Twitch's documented implicit
flow rather than inventing unsupported PKCE behavior or exposing a secret.
If Twitch later documents a browser-safe code/PKCE flow, migrate to it. A server
would also allow a separate code flow, but no backend is introduced in this phase.

No scopes are requested: public channel/stream/user/video/clip endpoints accept a
user access token without additional scopes. No email, chat, follow-list, or
broadcast-management permission is requested.

## Session security

`auth.js` generates 32 random bytes with Web Crypto, saves a pending state in
sessionStorage, and validates the returned state, matching Client ID, and a
10-minute authorization window. Pending states are single-use, including denial
and invalid callbacks. Login fails closed when session storage is unavailable.
Returned token/error parameters are removed with `history.replaceState` before
API loading. Tokens are never logged or written to localStorage.

The token is stored only in sessionStorage (`twitchunblock.session`); there are no
refresh tokens or long-lived private credentials. Validation uses Twitch's
[`/validate` endpoint](https://dev.twitch.tv/docs/authentication/validate-tokens/)
on load and at least hourly while active, verifies Client ID/user/expiry, and
clears an invalid session. Helix 401 responses also clear the session. Logging
out clears local session/state immediately and makes a best-effort revocation
request. Expiration requires a fresh sign-in.

Session storage protects against persistence across browser sessions, not against
scripts executing on the same origin. This plain static app loads no third-party
JavaScript. API fields are rendered as text, not injected HTML. Remote image URLs
are limited to HTTPS Twitch image hosts, and outbound media/channel URLs are
constructed from validated identifiers.

## Data availability and testing

Twitch Helix requires an app or user access token even for public search and live
streams. An app token requires a confidential server-side credential. Consequently
this static implementation loads live data after user sign-in; it does not pretend
anonymous calls or bundled credentials can provide real results.

Until the Client ID is configured, login is visibly disabled with a localized
explanation. Home and Search use the implemented data controllers but show the
configuration/sign-in requirement. History and language/clear-history settings
work without authentication. Opening a saved channel's current metadata requires
sign-in again. No fixture results are shipped in the application.

`tests/phase2.cjs` uses intercepted Twitch responses and an explicitly test-only
Client ID/token. These are mocked integration tests, **not** successful live Twitch
search or OAuth consent tests. Real tests without configuration can establish the
public page loads and that unauthenticated Helix rejects calls; they cannot verify
successful real search. After setup, manually verify sign-in, Home, a live and an
offline channel, recent VODs/clips, reload, expiry, and logout on the public URL.
