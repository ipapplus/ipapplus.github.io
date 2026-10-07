# Twitch application configuration

Public Client ID is configured in `assets/js/config.js`, supplied by the owner.
Registered redirect URI: **https://ipapplus.github.io/twitchunblock/**

## Public-client login

Twitch public clients only support the documented [Device Code Grant Flow](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#device-code-grant-flow).
The app requests a device challenge, displays a Twitch activation link and code,
and polls at the server interval (at least five seconds). Approve in Twitch while
keeping the app open. This flow does not redirect credentials back to the app.
No client secret, backend, unsupported PKCE parameters, or additional scopes are used.

The challenge is held in memory and tied to one cancellable login attempt.
Pending/slow-down responses are handled; expired/denied attempts require retry.
Only validated access tokens are retained in sessionStorage (`twitchunblock.session`).
Refresh tokens are discarded. Tokens are never logged or stored in localStorage.
Validation checks Client ID, user and expiry on startup and hourly; Helix 401 and
expiration clear the session. Logout clears locally and revokes best effort.
Legacy implicit callbacks are rejected and removed from the address bar.

Public Home, Search, channel, VOD and clip endpoints require sign-in. No fixture
data or other developer credentials are shipped. API values render as text, with
validated identifiers and Twitch image hosts. Tests in `tests/phase2.cjs` are
explicitly mocked browser tests, separate from real Twitch consent/Helix tests.
No new service worker is installed; any future worker must scope `/twitchunblock/`.

## Real browser validation

Serve the repository root on port 8765, then run `tests/live.cjs` with
`PLAYWRIGHT_MODULE` pointing to Playwright. For production set `LIVE_URL` to
`https://ipapplus.github.io/twitchunblock/`. Each engine displays a one-time
Twitch approval link; approve it using your own account within 90 seconds.
An optional `TWITCH_APPROVAL_HELPER` executable receives that link for local
browser automation. It must not capture or log access tokens. This suite uses
real Twitch consent and Helix without interception, then revokes its token and
confirms real validation returns 401. Local expiry is simulated separately.
