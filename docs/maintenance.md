# Maintenance

Put `.deb` files beside `up.sh` or in `debs/`, or delete archives from `debs/`, then run:

```sh
./up.sh
```

Git status supplies added, modified and deleted `.deb` paths, including staged, unstaged and untracked changes. Root archives are visible to Git status and move into `debs/` using package, version and architecture filenames. A root archive replaces an existing build with the same identity.

Only added or changed archives are opened and passed to `dpkg-deb --field`. Required APT package sizes and checksums are computed only for those archives. There is no directory inventory, stat-cache traversal, or fallback extraction of unchanged archives. With no changed package paths, the generator exits immediately without reading repository metadata or running dpkg-deb.

Existing `Packages` entries supply the unchanged inventory and are retained byte-for-byte. Existing depictions and catalog cards are reused. Changed packages receive new depictions and catalog cards; surviving siblings in affected groups retain their depictions with available-build links patched. Deleted entries and their depictions are removed using existing package identities without scanning directories. Provenance and depiction-manifest records are retained for unchanged packages.

Packages changes update the compressed indexes and Release sizes and checksums. The catalog is assembled from reused cards and affected groups. These combined files necessarily include all surviving entries, but generation never reopens their archives. Existing `Packages` metadata is required; deleting it is not a request to rebuild from archives. `.repo-cache.json` is no longer used.

The wrapper disables Git hooks, runs `git add -A`, commits with `Update repository` when needed, and always runs `git push origin main`. All working-tree changes are staged. The repository publishes unsigned metadata.

No checks, audits, package validation, tests, background suites or post-build verification run. Required tools are POSIX sh, Perl core modules, dpkg-deb, gzip, bzip2, xz and Git.
