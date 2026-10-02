# Package imports

Copy new `.deb` files into `debs/`, then run `sh up.sh` as before. To build
without committing or pushing, run `sh build.sh`. The scripts use the existing
`apt-ftparchive` tool and Perl's bundled `JSON::PP` module; no libraries to install.

The build uses `assets/scripts/record-additions.pl` to append a record to
`assets/data/latest-additions.json` only for an unseen package
ID. Its version is the version first imported, and `addedAt` is the import time
in UTC (ISO 8601). Additional architectures, updates, removals, and reimports
never replace that record. Keep this JSON file committed and backed up: it is
the permanent addition history. A missing or malformed file stops the build.

The package cards on `packages.html` use this JSON for newest-first sorting and
relative addition times. No file dates, commit dates, or response headers are
used for additions.

AppSync Unified's previously unknown date was initialized once to the start of
2026-10-02 in Riyadh time, the repository creation day. Builds never migrate or
reset existing timestamps. Package cards sort by
the saved date and display compact times such as `15m ago` or `3d ago`.
