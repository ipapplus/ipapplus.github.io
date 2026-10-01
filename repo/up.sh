#!/bin/sh
set -eu
export LC_ALL=C LANG=C
cd "$(dirname "$0")"
if [ "$#" -ne 0 ]; then
    printf '%s\n' 'Usage: ./up.sh (no arguments)' >&2
    exit 2
fi
if [ "$(command git branch --show-current)" != main ]; then
    printf '%s\n' 'Run ./up.sh on the main branch.' >&2
    exit 1
fi

# Hooks must not start tests or other automatic verification.
git() { command git -c core.hooksPath=/dev/null "$@"; }

# Keep package archives in one predictable place. Archives dropped next to
# up.sh are sorted automatically by their control Architecture field.
mkdir -p debs/rootful debs/rootless debs/roothide
for deb in ./*.deb; do
    [ -e "$deb" ] || continue
    arch=$(dpkg-deb -f "$deb" Architecture 2>/dev/null | tr -d '[:space:]') || {
        printf 'Invalid deb archive: %s\n' "$deb" >&2
        exit 1
    }
    case "$arch" in
        iphoneos-arm|arm) target=debs/rootful ;;
        iphoneos-arm64|arm64) target=debs/rootless ;;
        iphoneos-arm64e|arm64e) target=debs/roothide ;;
        *)
            printf 'Unsupported Architecture "%s" in %s\n' "$arch" "$deb" >&2
            exit 1
            ;;
    esac
    name=${deb#./}
    if [ -e "$target/$name" ]; then
        printf 'Refusing to overwrite existing archive: %s\n' "$target/$name" >&2
        exit 1
    fi
    mv -- "$deb" "$target/$name"
    printf 'Moved %s -> %s/\n' "$name" "$target"
done

perl repo.pl

git add -A
if git diff --cached --quiet --exit-code; then
    printf '%s\n' 'Repository is already up to date.'
    exit 0
else
    status=$?
    if [ "$status" -ne 1 ]; then exit "$status"; fi
    git commit -m "Update repository"
fi
git push origin main
