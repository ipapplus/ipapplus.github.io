# Maintenance

Put `.deb` files beside `up.sh` or in `debs/`, or remove archives from `debs/`, then run:

```sh
./up.sh
```

Root archives move into `debs/` using package, version and architecture filenames. A root archive replaces an existing build with the same identity. Archives placed directly in `debs/` retain their filenames.

The generator extracts control metadata with `dpkg-deb --field` and computes the sizes and checksums needed by Packages. It caches these values in ignored `.repo-cache.json`, using device, inode, size, modification time and change time to detect archive changes. Unchanged archives are not opened. Removing the cache causes metadata extraction on the next run.

Packages, gzip/bzip2/xz indexes, Release, HTML/Sileo depictions, catalog and provenance are generated from the current inventory. Unchanged indexes are not recompressed. Obsolete generated HTML/JSON depictions are removed. Addition history survives package deletion. Unchanged generated files and Release dates remain unchanged.

The repository publishes unsigned metadata. Obsolete InRelease and Release.gpg files are removed. There is no signing or signature verification step.

The wrapper disables Git hooks, runs `git add -A`, commits changes with `Update repository` when needed, and always runs `git push origin main`, including when there is no new commit. All working-tree changes are staged.

There are no automatic checks, audits, package validation, tests, background suites, post-build verification, transaction backups or rollback. Command failures stop publication. Required tools are POSIX sh, Perl core modules, dpkg-deb, gzip, bzip2, xz and Git.
