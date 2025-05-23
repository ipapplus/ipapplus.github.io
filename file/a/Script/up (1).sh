#!/bin/bash

BASE_DIR="./debs"
OUTPUT_FILE="Packages"
ARCHS=("arm" "arm64" "arm64e")

for deb in ./*.deb; do
    [ -e "$deb" ] || continue

    tmp_dir=$(mktemp -d)
    dpkg-deb -R "$deb" "$tmp_dir" >/dev/null 2>&1

    pack=$(grep '^Package:' "$tmp_dir/DEBIAN/control" | cut -d' ' -f2- | xargs)
    vers=$(grep '^Version:' "$tmp_dir/DEBIAN/control" | cut -d' ' -f2- | xargs)
    arch=$(grep '^Architecture:' "$tmp_dir/DEBIAN/control" | cut -d' ' -f2- | xargs)

    new_deb="${pack}_${vers}_${arch}.deb"
    dpkg-deb -bZgzip "$tmp_dir" "$new_deb" >/dev/null 2>&1

    rm -rf "$tmp_dir"
done

for ARCH in "${ARCHS[@]}"; do
    mkdir -p "$BASE_DIR/$ARCH"
done

for deb in ./*.deb; do
    [ -e "$deb" ] || continue

    arch=$(dpkg-deb -f "$deb" Architecture | sed 's/^iphoneos-//' | tr -d '[:space:]')
    dest_dir="$BASE_DIR/$arch"

    if [ -d "$dest_dir" ]; then
        mv "$deb" "$dest_dir/"
    fi
done

> "$OUTPUT_FILE"

for ARCH in "${ARCHS[@]}"; do
    ARCH_DIR="$BASE_DIR/$ARCH"
    if [ -d "$ARCH_DIR" ]; then
        apt-ftparchive packages "$ARCH_DIR" >> "$OUTPUT_FILE"
    fi
done

bzip2 -kf "$OUTPUT_FILE"
gzip -kf "$OUTPUT_FILE"
zstd -q -f -o Packages.zst "$OUTPUT_FILE"

git add --all
git commit -m "Init"
git push