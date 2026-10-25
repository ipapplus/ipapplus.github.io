# Player validation and deployment

`npm ci`, `npm run validate:assets`, and `npm test` work in sparse checkout.
Do not disable sparse checkout or stage excluded recordings. `npm run build`
intentionally refuses to build if a tracked recording is missing. A full Pages
build requires the actual repository audio; GitHub Actions checks out that content.

For browser tests, use an isolated temporary copy of `web` and already available
local recordings. Call the exported `build(temporaryRoot)` there, then use its
ignored `dist` output with `npm run test:browser`. Never produce or publish an
empty library as a substitute for excluded audio. The browser download/range tests
compare with the built media bytes so that source MP3s need not exist locally.

Before deployment, source validation parses every JavaScript module with Acorn,
including static imports/re-exports, literal dynamic imports and worker
`importScripts`. Computed imports fail until the validator supports them explicitly.
It checks the worker pre-cache array, HTML asset attributes, CSS URLs/imports,
manifest icons and module-relative URLs against files and the Git index file list.
Only `_player/library.json` and `.nojekyll` may be generated instead of tracked.
`npm run validate:assets -- --index` also verifies staged web bytes match disk.
The post-build check requires generated assets, an expanded worker fingerprint,
every tracked recording and byte-identical copied source assets. Both checks gate
Pages artifact upload and deployment; browser regressions also gate deployment.
CI pins Ubuntu 24.04 and starts a PulseAudio null sink with `norewinds=1`
(50 ms blocks) so Firefox has a rendering clock without physical sound hardware.
The default null sink can buffer two seconds, exceeding the player resume timeout.
See the [PulseAudio null-sink implementation](https://github.com/pulseaudio/pulseaudio/blob/master/src/modules/module-null-sink.c). This preserves actual media-source/gain signal assertions rather
than skipping them. The large preference/layout matrix has a 60-second case budget.

## Web Audio and iPhone

The native path remains the default at normal level. Changed volume or mute is
persisted in project preferences and applied on the next Play gesture. The selected
range is 0–2 internally; visible text describes only quiet/normal/loud/muted.

Graph creation and resume occur synchronously within interaction handlers. A touch
can activate WebKit at release rather than pointerdown, so pointerup/touchend,
keyboard and committed slider changes retry resume while activation is available.
A first touch drag only updates the selected/native level until release, avoiding
a premature resume timeout during a long hold; existing gain graphs update live.
A pending resume may be completed by a later successful attempt, without creating
another media source or output connection. `audio.play()` is never delayed by an
unrelated await. A near-full-scale soft knee protects raised peaks; normal audio
and quieter speech remain linear. No original recording is changed.

Same-origin URLs, including worker-supplied range responses and verified offline
cache entries, retain the media-element route. Foreign-origin media is left native
rather than attached to a graph that may output CORS silence. Existing wireless
remote playback falls back to the native element; Bluetooth remains the system's
output route. The controller never requests capture, a microphone, a silent
keepalive or an output-device override.

Suspended/interrupted contexts resume on foregrounding while playback is active.
Paused media stays paused. No explicit suspension occurs when hiding the page.
Hidden-page resume failures retain the graph for foreground recovery. A bounded
foreground timeout, closed context or frozen rendering clock restores native output
by replacing the irreversibly routed media element, preserving source, time, speed
and application listeners. Position restoration also retries on data/readiness events
when WebKit metadata initially reports a zero duration. A denied replacement play
surfaces an actionable message.

Known WebKit behavior and API constraints:

- [WebKit resume stalls](https://bugs.webkit.org/show_bug.cgi?id=281566).
- [WebKit background suspension](https://bugs.webkit.org/show_bug.cgi?id=261554).
- [Web Audio media-element and CORS semantics](https://www.w3.org/TR/webaudio-1.1/#MediaElementAudioSourceNode).
- [Apple's archived native volume restrictions](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/Using_HTML5_Audio_Video/Device-SpecificConsiderations/Device-SpecificConsiderations.html).

These sources explain constraints, not confirmation that any particular iOS release
works. Chromium/Firefox output measurements and Linux WebKit automation cannot
certify physical iPhone Safari or installed-PWA amplification. Hardware checks must
include low-level speech at midpoint/maximum, mute/reload/track changes, screen lock,
background/foreground, external audio and return from application suspension.
If the platform denies processing, native playback continues; read-only native
volume requires the device buttons. A fully clipped source cannot become twice as
loud without peak limiting. Some OS audio-session failures require a fresh user Play
interaction and cannot be repaired by web code alone.
