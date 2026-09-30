#!/bin/sh
set -eu
export LC_ALL=C LANG=C
if [ "$#" -gt 0 ]; then
    exec perl "$(dirname "$0")/scripts/repo.pl" "$@"
fi

cd "$(dirname "$0")"
# auto already processes packages, rebuilds, and validates the candidate/live tree.
perl scripts/repo.pl auto
perl scripts/repo.pl check

git add -A
if git diff --cached --quiet --exit-code; then
    printf '%s\n' 'Repository is already up to date.'
    exit 0
else
    status=$?
    # A diff returns 1 for changes; any other status is an error.
    if [ "$status" -ne 1 ]; then exit "$status"; fi
fi
git commit -m "Update repository"
git push origin main
printf '%s\n' 'Repository successfully pushed to origin/main.'
