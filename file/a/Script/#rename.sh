#!/bin/sh

DEB_DIRS="./debs/arm ./debs/arm64 ./debs/arm64e"

for DEB_DIR in $DEB_DIRS; do
    for deb_file in $DEB_DIR/*.deb; do
        if [ -f "$deb_file" ]; then
            NEW=$(mktemp -qd)
            
            dpkg-deb -R "$deb_file" "$NEW"
            
            pack=$(cat "$NEW"/DEBIAN/control | grep Package: | awk '{for (i=2; i<NF; i++) printf $i " "; print $NF}' | tr -d '[:space:]')
            vers=$(cat "$NEW"/DEBIAN/control | grep Version: | awk '{for (i=2; i<NF; i++) printf $i " "; print $NF}' | tr -d '[:space:]')
            arch=$(cat "$NEW"/DEBIAN/control | grep Architecture: | awk '{for (i=2; i<NF; i++) printf $i " "; print $NF}' | tr -d '[:space:]')
            
            arch=$(echo $arch | sed 's/^iphoneos-//')

            mv "$deb_file" "${pack}_${vers}.${arch}.deb" >/dev/null 2>&1
            
            rm -rf "$NEW"
        fi
    done
done