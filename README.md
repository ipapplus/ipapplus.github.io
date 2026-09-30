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

## Repository structure

```text
.github/workflows/validate.yml  Read-only CI and temporary regression tests
debs/                          Canonical managed package archives
depictions/                    Generated HTML and Sileo JSON
scripts/                       Perl generator and regression tests
docs/maintenance.md            Signing, publication and recovery
CydiaIcon.png                  Local repository/profile image
Packages{,.gz,.bz2,.xz}         Generated flat APT indexes
Release                        Generated index sizes and hashes
index.html                     Repository home page
packages.html                  Generated grouped catalog
package-history.json           Persistent repository-owned addition history
provenance.json                 Generated archive hashes and upstream metadata
generated-files.json            Generated depiction ownership hashes
repo.conf                      Repository identity, URL and target allowlist
up.sh                          Maintainer entry point
README.md, SECURITY.md, LICENSE Usage, reporting and source licensing
.gitattributes, .gitignore      Git file handling and local exclusions
```

## Maintainers

**Add:** copy one or more `.deb` files beside `up.sh`, then run:

```sh
./up.sh
```

It scans only the root, validates the entire batch, imports canonical filenames, verifies SHA256, records history, removes verified root copies, rebuilds and validates all generated outputs, and runs local APT tests where available. Archive bytes are never repacked, converted or installed. Missing indexes and an empty `debs/` do not prevent root-import recovery.

```sh
./up.sh remove PACKAGE_ID                           # preview all versions/builds; confirm [y/N]
./up.sh remove PACKAGE_ID --arch iphoneos-arm64      # only this target
./up.sh remove PACKAGE_ID --version VERSION         # only this version
./up.sh remove PACKAGE_ID --version VERSION --arch iphoneos-arm64
./up.sh rebuild                                     # reconstruct all generated outputs
./up.sh list                                        # read-only package/version/build inventory
./up.sh check                                       # strictly read-only validation
./up.sh clean                                       # only recognized disposable build artifacts
```

Running `./up.sh` with no arguments processes packages, rebuilds, runs local validation, then runs `git add -A`, commits changes with `Update repository`, and pushes to `origin main`. Any rebuild or validation failure stops before staging. An unchanged repository prints `Repository is already up to date.` without an empty commit. Push errors remain visible and exit non-zero; success is reported only after push succeeds. This stages all changes, including unrelated additions, modifications, and deletions. GitHub Actions is not required.

`./up.sh build` remains an alias for `rebuild`. Explicit `./up.sh import '/path/file.deb'` retains its source and requires a subsequent rebuild. Commands with arguments perform their local operation without Git publication; `./up.sh auto` runs the package/rebuild/validation operation alone. The unsigned repository requires no signing identity.

**Sources of truth:** `debs/*.deb` supplies package contents and metadata; `repo.conf` supplies repository configuration; `package-history.json` preserves chronology that archives cannot reconstruct. Back up these inputs together. The website source, icon and documentation remain maintained source files.

**Generated:** `Packages*`, `Release`, `packages.html`, depictions, `provenance.json` and `generated-files.json`. Do not edit them manually. Delete missing/corrupt outputs if needed and use `./up.sh rebuild`. Direct insertion into `debs/` is not the normal workflow; rebuild accepts valid canonical archives there, but rejects noncanonical filenames with instructions to import through the root.

Removal requires confirmation and rebuilds everything from surviving archives. Removing the final package produces valid empty indexes and a zero-package catalog. Rebuild stages and validates output before replacement, keeps rollback copies during replacement, and removes only stale depictions whose ownership hashes match. Unknown or modified stale files are preserved for review.

Required: POSIX sh, Perl core modules, dpkg/dpkg-deb, gzip, bzip2 and xz. Local APT testing additionally uses apt-get and apt-cache. The wrapper sets the C locale.

### Addition order and available builds

Each exact `Package` + `Version` has a persistent first-import UTC time and sequence. The catalog sorts newest sequence first. New versions count as new additions; rebuilds, duplicates and additional architectures do not reset chronology. Removed versions retain historical records so restoration preserves their original position. Generated pages show only currently available archives.

The original groups and manually restored managed archives without trustworthy history use a null date and sequence zero. They sort behind recorded additions, with SHA256 of identity/version as a stable, non-alphabetical tie-breaker. Root imports without existing history record the current observed import time, never an invented past date. Same-batch additions receive deterministic sequences in canonical archive order. Filesystem and archive-internal dates are never used as import dates.

Cards group exact `Package` + `Version`. Their summary comes from the first available Rootful, Rootless or RootHide build; per-build depictions preserve differing metadata. The catalog's Download action opens the archive directly for a single build, or offers the available Rootful, Rootless and RootHide builds. Without JavaScript, multi-build downloads remain available through package details. Live search matches partial names, identifiers and descriptions. The update time uses the latest known first-added date among current packages; rebuilds do not reset it. Existing depiction URLs remain stable.

### Provenance and rights

[provenance.json](provenance.json) and package details expose SHA256, first-added dates where known, and author/maintainer/upstream URLs when present in archive metadata. These fields are unverified claims from the archive. A homepage or depiction does not establish where an archive was obtained or who built it. Unknown original download sources remain unknown.

Repository-owned scripts, site source code, documentation and original metadata contributions are licensed under the [MIT License](LICENSE), within its stated scope. Repository scripts and site code must be considered separately from third-party `.deb` archives, artwork and upstream metadata. Generated indexes and depictions include third-party descriptions and author information; generation does not establish ownership of that material. No repository license grants rights to redistributed packages. Package authors retain their respective rights, and redistribution permission must be confirmed individually before publication, including the archive identifying Apple as its author.

See [SECURITY.md](SECURITY.md) for problem reports and [maintenance documentation](docs/maintenance.md) for validation, signing, recovery, snapshot deployment, and compatibility decisions.
