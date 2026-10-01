apt-ftparchive packages ./debs > Packages && date -u +%Y-%m-%dT%H:%M:%SZ > last-updated.txt

git add --all
git commit -m "Init"
git push
