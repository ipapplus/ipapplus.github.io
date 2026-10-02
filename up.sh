#!/bin/sh
set -eu
cd "$(dirname "$0")"
sh ./build.sh

git add --all
git commit -m "Init"
git push
