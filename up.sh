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
perl scripts/repo.pl

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
