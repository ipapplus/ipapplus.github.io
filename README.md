# ipapplus APT repository

Add, replace, or remove `.deb` files in `debs/`, then run:

```sh
./up.sh
```

Run on `main`. The script rebuilds the complete repository, stages all changes,
commits with `Update repository`, and pushes to `origin/main`. An unchanged run
exits without a commit or push. There are no command modes or automatic tests.

Archives at the repository root are also supported, as are subdirectories of
`debs/`. Archives stay at their original paths; the generator never changes their
payload or control metadata. Duplicate Package/Version/Architecture identities
are rejected with both archive paths so you can choose which archive to keep.

## Structure

```text
debs/                       package archives (source of truth)
up.sh                       the only normal user command
scripts/repo.pl             internal full-rebuild implementation
repo.conf                   repository identity and public URL
Packages{,.gz,.bz2,.xz}      generated APT indexes
Release                     generated unsigned index checksums and sizes
depictions/                 generated web and Sileo package pages
packages.html               generated searchable package catalog
provenance.json             generated archive hashes and upstream metadata
package-history.json        first-added dates/order for currently present versions
index.html, CydiaIcon.png   maintained homepage and icon
```

`depictions/` is reserved for generated `.html` and `.json` files. A rebuild
removes pages for absent packages and refreshes all surviving build/download
links. Keep handwritten website files elsewhere. Do not manually edit generated
indexes or pages: every run reconstructs them from the archives.

The target labels remain `iphoneos-arm` (Rootful), `iphoneos-arm64` (Rootless),
and `iphoneos-arm64e` (RootHide). Other declared architectures are kept verbatim;
`all` is shown as All architectures. Device compatibility is not inferred.

History preserves existing first-added dates for live package/version groups;
new groups get the current UTC date, and absent groups are removed. Missing
history does not prevent rebuilding indexes: new discovery dates are recorded.
Provenance contains archive claims, not verified original download sources.

Requirements: Perl with its standard modules, `dpkg-deb`, `gzip`, `bzip2`, `xz`,
and Git. All three published compressed formats are retained for existing
clients. No lock, cache, generated-file manifest, or maintenance suite is used.

Generation and compression finish in a temporary directory before publication.
Malformed metadata identifies its archive and prevents Git publication. Ordinary
publication errors are rolled back using temporary copies of the previous
outputs. An uncatchable process kill or power loss during replacement cannot be
rolled back automatically; rerunning reconstructs outputs from the archives.
Run one update at a time and avoid changing archives while it is rebuilding.
Release is written last. Its Date records the latest changed publication;
a byte-identical rebuild preserves that date and the other output bytes.

`git add -A` includes other pending repository changes too. Local Git hooks are
bypassed; no legacy tests run during normal updates. If a push fails, the local
commit remains available to retry with `git push origin main`.
