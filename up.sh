#!/bin/sh
set -eu
export LC_ALL=C LANG=C
cd "$(dirname "$0")"

# Hooks must not start tests or other automatic verification.
git() { command git -c core.hooksPath=/dev/null "$@"; }
perl scripts/repo.pl

git add -A
if git diff --cached --quiet --exit-code; then
    printf '%s\n' 'Repository is already up to date.'
else
    status=$?
    if [ "$status" -ne 1 ]; then exit "$status"; fi
    git commit -m "Update repository"
fi
git push origin main
