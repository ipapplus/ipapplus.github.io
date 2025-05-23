apt-ftparchive packages ./debs > Packages
gzip -k -f Packages
bzip2 -k -f Packages
xz -k -f Packages
zstd -k -f Packages
git add --all
git commit -m "Init"
git push