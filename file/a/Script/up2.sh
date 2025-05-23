#!/bin/bash

rm -f Packages Packages.gz Packages.bz2 Packages.xz Packages.zst
apt-ftparchive packages ./debs > Packages
gzip -k -f Packages
bzip2 -k -f Packages
xz -k -f Packages
zstd -k -f Packages
git add --all
git commit -m "Sync Packages with debs/"
git push