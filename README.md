# ipapplus APT Repository

A small jailbreak APT repository with a static package catalog and package details.

**Repository URL: https://ipapplus.github.io/**

## Add the repository

Open the [repository website](https://ipapplus.github.io/) and tap Add to Sileo to copy the URL and open Sileo. You can also paste the URL into your compatible package manager's source list.

For compatible APT clients, the flat source entry is:

```text
deb https://ipapplus.github.io/ ./
```

| Repository target | Package architecture |
| --- | --- |
| Rootful | `iphoneos-arm` |
| Rootless | `iphoneos-arm64` |
| RootHide | `iphoneos-arm64e` |

Choose the build required by your jailbreak. Here `arm64e` means the RootHide packaging target; it is not a generic device compatibility claim. Sileo, Zebra, and compatible APT/Cydia clients can consume the repository, subject to their jailbreak and package support. Package metadata declares dependencies and firmware requirements; these have not necessarily been independently verified.

[Browse packages](https://ipapplus.github.io/packages.html). Downloads are grouped by package and version, with only the builds actually available. The repository is currently unsigned.

## Maintainers

Put `.deb` files beside `up.sh` or in `debs/`, or delete packages from `debs/`, then run:

```sh
./up.sh
```

The command uses Git status to process only added, changed or deleted `.deb` paths. It reuses unchanged Packages entries, depictions and catalog cards, updates affected records and combined APT metadata, and removes deleted package depictions. Unchanged archives are never reopened. It stages all changes, commits with `Update repository` when needed, and always pushes to `origin main`. Git hooks are disabled. No checks, validation, audits or tests run.

`dpkg-deb --field` extracts metadata only for Git-reported new or changed archives. Existing `Packages` supplies unchanged metadata; there is no full-scan fallback or cache population step. With no changed package paths, the generator exits immediately.

`debs/`, `repo.conf` and `package-history.json` supply inventory, configuration and chronology. Generated outputs include APT indexes, unsigned Release metadata, depictions, catalog, provenance and a depiction manifest.

Required: POSIX sh, Perl core modules, dpkg-deb, gzip, bzip2, xz and Git.

### Addition order and available builds

Each exact `Package` + `Version` has a persistent first-import UTC time and sequence. The catalog sorts newest sequence first. New versions count as new additions; rebuilds, duplicates and additional architectures do not reset chronology. Removed versions retain historical records so restoration preserves their original position. Generated pages show only currently available archives.

Existing historical groups retain their dates and sequences; newly observed groups receive a current addition time. They sort behind recorded additions, with SHA256 of identity/version as a stable, non-alphabetical tie-breaker. Packages without existing history record the current observed addition time, never an invented past date. Same-batch additions receive deterministic sequences in canonical archive order. Filesystem and archive-internal dates are never used as import dates.

Cards group exact `Package` + `Version`. Their summary comes from the first available Rootful, Rootless or RootHide build; per-build depictions preserve differing metadata. The catalog's Download action opens the archive directly for a single build, or offers the available Rootful, Rootless and RootHide builds. Without JavaScript, multi-build downloads remain available through package details. Live search matches partial names, identifiers and descriptions. The update time uses the latest known first-added date among current packages; rebuilds do not reset it. Existing depiction URLs remain stable.

### Provenance and rights

[provenance.json](provenance.json) and package details expose SHA256, first-added dates where known, and author/maintainer/upstream URLs when present in archive metadata. These fields are unverified claims from the archive. A homepage or depiction does not establish where an archive was obtained or who built it. Unknown original download sources remain unknown.

Repository-owned scripts, site source code, documentation and original metadata contributions are licensed under the [MIT License](LICENSE), within its stated scope. Repository scripts and site code must be considered separately from third-party `.deb` archives, artwork and upstream metadata. Generated indexes and depictions include third-party descriptions and author information; generation does not establish ownership of that material. No repository license grants rights to redistributed packages. Package authors retain their respective rights, and redistribution permission must be confirmed individually before publication, including the archive identifying Apple as its author.

See [SECURITY.md](SECURITY.md) for problem reports and [maintenance documentation](docs/maintenance.md) for the incremental publishing workflow.
