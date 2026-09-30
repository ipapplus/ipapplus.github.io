# Maintenance

## Validation

```sh
./up.sh check
LC_ALL=C perl scripts/test-repo.pl
LC_ALL=C perl scripts/test-auto.pl
LC_ALL=C perl scripts/test-catalog.pl
LC_ALL=C perl scripts/test-lifecycle.pl
LC_ALL=C perl scripts/test-apt.pl
```

Regression scripts operate in disposable repositories. They inspect real archives and build synthetic fixtures without installing payloads. The automatic command runs APT when apt-get and apt-cache are present; any actual APT failure fails the command. Missing APT is reported as SKIP.

GitHub Actions runs syntax checks, `./up.sh check`, and portable regressions. `REPO_PORTABLE_TESTS=1` skips only the automatic device APT stage in temporary test repositories. It does not weaken archive, metadata, compressed index, Release, depiction, history, catalog, or link checks. Run `scripts/test-apt.pl` directly on jailbreak APT to test all declared targets; it never consults this opt-out. Linux APT does not necessarily implement the target bootstrap's architecture semantics. CI additionally sets `REPO_SKIP_DEVICE_EMPTY_TEST=1` for the explicit empty-repository target APT test inside the lifecycle suite. Device runs leave it unset. No CI publication or private signing key is required. If signed metadata is later committed, configure verification with the corresponding public key; private keys remain local.

## Source of truth and commands

`debs/*.deb` is the canonical managed archive store. `repo.conf` is configuration. `package-history.json` is authoritative only for repository chronology; keep it when restoring archives. Indexes, Release, depictions, catalog, provenance and `generated-files.json` are derived output. Neither import nor rebuild reads Packages as package inventory.

| Command | Behavior |
| --- | --- |
| `./up.sh` | Scan root `.deb` files, validate/import, rebuild/check, run available target APT tests, stage all changes, commit `Update repository`, push `origin main` |
| `./up.sh rebuild` | Reconstruct derived files solely from managed archives, configuration and history |
| `./up.sh remove ID` | Preview every matching version/architecture; require `y` or `yes`; default No |
| `./up.sh remove ID --version V --arch A` | Apply either or both explicit filters; never guess a version |
| `./up.sh list` | Read-only groups by package/version and available targets; no indexes/history needed |
| `./up.sh check` | Read-only validation; reports missing/stale files and recommends rebuild |
| `./up.sh clean` | Remove only marked, recognized disposable generated-only staging directories |
| `./up.sh build` | Compatibility alias for rebuild |
| `./up.sh import FILE...` | Explicit import, keep original sources; rebuild separately |

Check/list acquire shared read locks without creating or writing `.repo.lock`. Writers acquire exclusive locks. A directory lock covers the case where the persistent lock file does not exist. Never unlink the lock file while operations may be running.

## Import integrity and recovery

Root discovery happens before inventory/build. All candidates must be regular nonsymlink archives and pass metadata/payload inspection before any live file is changed. All candidates are validated as a batch. Conflicting bytes for the same package/version/architecture fail; identical reimports retain history. Canonical names are `Package_Version_Architecture.deb`, replacing epoch colons with underscores only in filenames.

The command stages archive copies and complete generated output, checks staged hashes and validates the staged repository. It then installs hash-verified archive copies, records history, replaces generated files (Release last), verifies both root sources and imported copies, removes verified root copies and obsolete owned files, and validates the live result. Rollback copies remain available until the operation commits. Explicit import omits generation and source deletion.

**Recovery from the reported failure:** if `debs/` is empty, indexes are missing and valid archives are in the root, run `./up.sh`. The root archives are imported before generation; old Packages files are not required. If managed archives are present and every generated output is deleted, use `./up.sh rebuild`.

Rebuild accepts canonical managed archives even if manually restored. A noncanonical filename is rejected without renaming/deleting it: move that candidate into the root and use normal import. Invalid managed archives likewise block rebuild without replacing existing output. Missing history for directly restored managed archives gets an unknown date and sequence zero, not the current date disguised as historical import. Root imports instead record a current observed addition unless an older history record survives. Removing an archive does not erase its historical record or reorder survivors.

Control fields are retained in Packages, including optional/custom fields. CRLF normalization affects parsed metadata only. `Depiction` and `SileoDepiction` are index-only overrides; original values remain in archives/provenance. No archive ownership, payload, binary, control metadata or RootHide packaging is rewritten. Package repair belongs to the author.

## Replacement and interrupted operations

Before live replacement, `.repo-transaction/` holds a journal and SHA256-checked rollback copies of every affected existing file, including root import sources and archives selected for removal. Ordinary replacement/validation errors roll back. An interrupted uncommitted transaction is restored automatically before the next mutating import/rebuild/remove operation proceeds. A completed transaction awaiting cleanup is finalized instead. Check/list refuse pending recovery without changing it; clean and snapshot also refuse pending transactions.

If rollback cannot complete, preserve `.repo-transaction/` and restore from its backups or an independent full backup. Do not remove it to silence an error. The journal is ignored by Git and excluded from snapshots. A damaged journal or damaged rollback copy blocks automatic recovery rather than guessing.

Replacement is atomic per file, not an atomic swap of the entire served directory. SIGKILL can temporarily leave mixed outputs until recovery runs; power loss/storage failure is not covered by a filesystem durability guarantee. Do not serve the working directory while maintenance runs. Use validated static snapshots for publication and keep an independent backup outside the site.

APT consumption tests run after the automatic transaction commits. An APT failure is reported as FAIL while leaving the internally validated repository and imported archives available for diagnosis; it does not claim to reverse a completed import.

## Removal, stale files and empty repositories

Removal shows exact paths, versions and targets and asks `Remove this package and rebuild repository? [y/N]`. Blank, EOF or any response other than `y`/`yes` cancels. No match or unsupported architecture filters fail without removal. No generated index is patched manually: the candidate inventory is regenerated and validated before deletion, and rollback protects the previous state.

`generated-files.json` records generated depiction paths and SHA256 values. A stale depiction is removed only when its bytes match that ownership record. Unknown files or modified stale depictions block rebuilding and remain untouched. Review and move such files outside `depictions/`; do not delete unfamiliar content to satisfy a check. The manifest is regenerated and is not needed to reconstruct deleted outputs. If it is missing while stale pages still exist, ownership cannot be proven and those pages require review.

Removing the last archive produces a zero-byte Packages file, valid gzip/bzip2/xz streams, matching Release sizes/hashes, empty provenance, an empty ownership manifest, no depictions, and an explicit zero-package catalog. Release advertises the configured targets for an empty repository. Existing device APT is tested against this state; this does not claim exhaustive testing of every historical GUI client.

Clean is conservative: it recognizes the generator's staging marker and an allowlist of generated-only files. It leaves unknown stages, archive/source/history copies, signing material, rollback directories and arbitrary fixtures alone. It never removes canonical archives, history, configuration, public sources or the persistent lock file. Keep test fixtures isolated using the provided regression scripts.

`SOURCE_DATE_EPOCH` fixes Release dates for repeatability tests; it never changes import chronology. Identical generated bytes are left untouched. Normal builds use the current UTC Release date. Existing repository identity and flat APT paths remain unchanged.

## Signing

Current local audit: GPG and gpg-agent 2.3.6 are installed, no secret signing key is available, and pinentry is missing. No identity has been created. The configured RootHide Procursus package index advertises `pinentry` version 1.2.0. In an appropriately privileged terminal, installation is:

```sh
apt-get install pinentry
```

This is optional for unsigned builds. After selecting or creating an owner-controlled identity outside the repository, use its full fingerprint:

```sh
export GPG_TTY="$(tty)"
REPO_SIGNING_KEY=YOUR_FULL_FINGERPRINT ./up.sh
```

Keep passphrases out of arguments, logs, environment variables and repository files. Use GPG's agent/pinentry to unlock an existing key privately. The batch signing workflow can use an unlocked agent key; a locked key may require a separate interactive GPG operation first. Select the signing identity and key policy yourself. Export only the public key when setting up client trust.

Signing stages InRelease and armored Release.gpg and verifies them before replacement. Failure leaves previous generated outputs intact. An already signed repository refuses unsigned rebuilds, preventing stale signatures. `./up.sh check` needs the public verification key for signed output, never the private key. Removing signatures is a deliberate trust change and is not an automatic recovery step.

APT regression uses `trusted=yes` only in isolated temporary configuration. It tests consumption and exact downloads, not public-key trust provisioning. It does not change system sources or install packages. Authenticated client testing remains pending a selected key and client trust setup.

## Publication and rollback

Do not serve the working directory during imports/builds. Create a validated, allowlisted snapshot after testing:

```sh
REPO_SNAPSHOT_DIR=/absolute/path/outside/repo/new-snapshot ./up.sh snapshot
```

The parent must exist and the destination must be new and outside the repository. The snapshot includes website files, original archives, generated indexes, depictions, provenance, LICENSE, SECURITY.md and signatures when present. It excludes configuration, scripts, logs, history input, backups and secret material. Snapshot creation does not publish anything. Publish a complete snapshot atomically through the chosen host only with owner authorization; retain previous snapshots for rollback and verify hosted indexes/downloads after deployment.

`.gitignore` protects common local artifacts from accidental tracking; it does not make an arbitrary working directory safe to serve or remove already tracked secrets. Never put private signing material inside the repository. Review `git status` and the public file set before publication.

## By-Hash and Valid-Until

Keep flat index URLs and omit Acquire-By-Hash. Compatibility across the intended Sileo, Zebra, Cydia/legacy APT and RootHide client versions has not been established. By-Hash also needs retained previous objects and does not make depictions transactional. Reconsider only with a client-version test matrix and retention policy. Use complete snapshots meanwhile.

Valid-Until remains omitted because there is no guaranteed publication schedule: a static repository should not expire unexpectedly. This loses expiry-based replay protection. Release Date remains current; controlled publication and signing still matter.

## Limits

Checksums prove consistency with this repository, not original authorship or package safety. Existing archive payloads are preserved, including any upstream ownership choices, Finder metadata and RootHide compatibility machinery. Review such issues with the package author. Metadata claims are not device runtime tests.

Basic HTML structure and local links are checked; native app handoff, screen-reader behavior, rendered appearance, external site availability and actual package execution need browser/device testing. External links can change independently of this repository.

The public APT tree is intended to be the Git repository root. GitHub discovers workflows in that root's `.github/workflows/` directory. If this tree is kept as a subdirectory of a larger checkout, arrange the workflow at the outer root with the correct working directory before enabling CI. No outer checkout or deployment configuration is changed by `up.sh`.
