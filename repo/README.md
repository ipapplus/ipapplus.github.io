# Package imports

Copy new `.deb` files into `debs/`, then run `sh up.sh` as before. To build
without committing or pushing, run `sh build.sh`. The scripts use the existing
`apt-ftparchive` tool and Perl's bundled `JSON::PP` module; no libraries to install.

The build appends a record to `latest-additions.json` only for an unseen package
ID. Its version is the version first imported, and `addedAt` is the import time
in UTC (ISO 8601). Additional architectures, updates, removals, and reimports
never replace that record. Keep this JSON file committed and backed up: it is
the permanent addition history. A missing or malformed file stops the build.

Both website pages display this JSON, newest first, with relative addition
times. No file dates, commit dates, or response headers are used for additions.

AppSync Unified predates tracking and has no known original addition date in
this checkout. Its initial `addedAt: null` means "Addition date unknown";
replace that null with its original ISO 8601 timestamp when known. Builds leave
it unchanged rather than inventing a date. All new imports receive a timestamp.
