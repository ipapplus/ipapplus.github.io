#!/bin/sh
set -eu
export LC_ALL=C LANG=C
fast_upload=false
if [ "$#" -eq 2 ] && [ "$1" = push ] && [ "$2" = --no-check ]; then
    fast_upload=true
elif [ "$#" -gt 0 ]; then
    exec perl "$(dirname "$0")/scripts/repo.pl" "$@"
fi

cd "$(dirname "$0")"
if [ "$fast_upload" = true ]; then
    # Hooks can launch tests or audits; disable them only for fast uploads.
    git() { command git -c core.hooksPath=/dev/null "$@"; }
    # Generate repository files only, with no checks or test processes.
    perl scripts/repo.pl auto --no-check
else
    # Preserve the normal package processing and validation workflow.
    perl scripts/repo.pl auto
    perl scripts/repo.pl check
fi

git add -A
if git diff --cached --quiet --exit-code; then
    if [ "$fast_upload" = true ]; then
        printf '%s\n' 'Nothing to upload'
    else
        printf '%s\n' 'Repository is already up to date.'
    fi
    exit 0
else
    status=$?
    # A diff returns 1 for changes; any other status is an error.
    if [ "$status" -ne 1 ]; then exit "$status"; fi
fi
git commit -m "Update repository"
git push origin main
printf '%s\n' 'Repository successfully pushed to origin/main.'
