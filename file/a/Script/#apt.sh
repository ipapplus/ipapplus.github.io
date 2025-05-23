#!/bin/bash

BASE_DIR="./debs"
OUTPUT_FILE="Packages"

mkdir -p "$BASE_DIR"

for deb in ./*.deb; do
    [ -e "$deb" ] || continue

    name=$(dpkg-deb -f "$deb" Name | tr -d '[:space:]')
    version=$(dpkg-deb -f "$deb" Version | tr -d '[:space:]')
    arch=$(dpkg-deb -f "$deb" Architecture | sed 's/^iphoneos-//' | tr -d '[:space:]')

    new_name="${name}.${version}.${arch}.deb"
    new_path="$BASE_DIR/$new_name"

    if [ ! -f "$new_path" ]; then
        mv "$deb" "$new_path"
    fi
done

> "$OUTPUT_FILE"

apt-ftparchive packages "$BASE_DIR" >> "$OUTPUT_FILE"

bzip2 -kf "$OUTPUT_FILE"
gzip -kf "$OUTPUT_FILE"
zstd -q -f -o Packages.zst "$OUTPUT_FILE"