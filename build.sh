#!/bin/sh
set -eu
cd "$(dirname "$0")"
index=$(mktemp ./Packages.XXXXXX)
trap 'rm -f "$index"' EXIT HUP INT TERM
apt-ftparchive packages ./debs > "$index"
LC_ALL=C perl ./assets/scripts/record-additions.pl "$index"
chmod 644 "$index"
mv "$index" Packages
