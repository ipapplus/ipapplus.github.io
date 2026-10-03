Timestamp audit and verification

The live pipeline is up.sh -> dpkg-deb import -> apt-ftparchive Packages ->
record-additions.pl -> latest-additions.json -> RepoUI.loadAdditions -> packages.js
card creation. There is no separate website build script or deployment timestamp
in this flow. Packages has no package import date field. File mtimes are not read
by the recorder or cards. HTTP Last-Modified is used only for the existing global
Last Updated / Last Seen indicators, not package ages.

Before this fix, both record-additions.pl's seen set and packages.js's addedDates
map were keyed only by Package. Cards were already grouped by Package + Version.
Consequently every version reused one package-level addedAt; a newly encountered
ID received the recorder execution time even if it had been imported earlier.
latest-additions.json was introduced at ebb29da, after UnderDock's import. That
initial record also replaced older history with later dates for many packages.

After the fix, latest-additions.json is the persistent version history. Both
recorder and cards use an unambiguous [Package, Version] key. Architectures share
one record for the same ID and exact Version; no cross-ID/version merging occurs.
Unknown versions receive a UTC Z timestamp after successful package indexing.
Existing entries are never changed or removed by the recorder. Missing, malformed,
or duplicate history fails the build rather than silently resetting timestamps.
Browser age uses Date.now() minus the stored instant; tooltip uses local time.
Minutes/hours/days are elapsed units (a day is 24 hours, not a calendar boundary).
Invalid dates render no age. Future dates clamp to the existing minimum 1m label
(and Just now for the shared long-form formatter); they cannot yield negative ages.

Recovery examined all 120 reachable commits, including deleted package-history.json
and repo/package-history.json, historical Packages, and current metadata. The old
scripts/repo.pl recorded first_added using gmtime(time) for new ID/version keys;
it did not use filesystem mtime. 384 records were recovered from that persistent
history, 12 missing records from first historical Packages appearances, and one
earlier current addedAt was retained. There are now 397 records, including removed
versions so reintroducing them cannot reset their dates. Git commit dates are used
only for this recovery, never by ongoing imports/rebuilds.

Recovered examples (Git first-appearance approximations, not exact import clocks):

| Version | Stored UTC timestamp | Evidence |
| --- | --- | --- |
| NetShield2 2.2.7 | 2026-10-02T10:21:19Z | ddffec4, first Packages/deb appearance |
| NetShield2 2.2.8 | 2026-10-03T16:47:26Z | 02f26bb, first Packages/deb appearance |
| UnderDock 1.3 | 2026-10-02T22:15:42Z | 6e2b113, first Packages/deb appearance |

UnderDock's evidence is Oct 3 01:15:42 in Riyadh, although Oct 2 in UTC. Available
history cannot prove an earlier Riyadh-calendar import. Its old timestamp was
2026-10-03T16:25:23Z, over 18 hours later. No current time was assigned in recovery.

Run python3 tests/timestamps.py to exercise the real up.sh pipeline in an isolated
copy with hardlinked input debs and Git publication suppressed. It checks two full
stable rebuilds, a genuine synthetic deb import, another architecture and Rootful
for that version, a distinct new version, repeated rebuilding, and corrupt history.
Synthetic packages never touch the live repository.

Frontend verification: python3 tests/frontend-timestamps.py [JavaScript runner].
It evaluates the real website.js plus the actual packages.js history mapping and
card creation functions with minimal DOM stubs. It checks 0/59/60 minutes and
24/48-hour boundaries, invalid and future instants, equal UTC/offset instants,
and the three recovered example versions across all architectures. Verified
using Apple's JavaScriptCore; this is a logic test, not a browser rendering test.

Verification completed: two live up.sh rebuilds with only Git staging/publication
suppressed left latest-additions.json byte-for-byte identical. The isolated
full-pipeline tests and frontend tests passed. Packages regenerated unchanged.
HTML changes only invalidate script caches. No CSS, layouts, download behavior,
filters, search, deb contents, repository paths, or publication settings changed.
