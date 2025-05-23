#!/bin/bash

BASE_DIR="./debs"
OUTPUT_FILE="Packages"
ARCHS=("arm" "arm64" "arm64e")

for ARCH in "${ARCHS[@]}"; do
    mkdir -p "$BASE_DIR/$ARCH"
done

for deb in ./*.deb; do
    [ -e "$deb" ] || continue

    dpkg-deb -x "$deb" temp_dir
    dpkg-deb -e "$deb" temp_dir/DEBIAN

    sed -i \
      -e '/^Recommended:/d' \
      -e 's/+debug//' \
      temp_dir/DEBIAN/control

    dpkg-deb --build temp_dir "$deb"
    rm -rf temp_dir

    name=$(dpkg-deb -f "$deb" Name | tr ' ' '.' | tr -d '[:space:]')
    version=$(dpkg-deb -f "$deb" Version | tr -d '[:space:]')
    arch=$(dpkg-deb -f "$deb" Architecture | sed 's/^iphoneos-//' | tr -d '[:space:]')
    new_name="${name}.${version}.${arch}.deb"
    new_path="$BASE_DIR/$arch/$new_name"
    [ ! -f "$new_path" ] && mv "$deb" "$new_path"
done

> "$OUTPUT_FILE"
for ARCH in "${ARCHS[@]}"; do
    ARCH_DIR="$BASE_DIR/$ARCH"
    [ -d "$ARCH_DIR" ] && apt-ftparchive packages "$ARCH_DIR" >> "$OUTPUT_FILE"
done

gzip -k -f "$OUTPUT_FILE"
bzip2 -k -f "$OUTPUT_FILE"
xz -k -f "$OUTPUT_FILE"
zstd -k -f "$OUTPUT_FILE"

git add --all
git commit -m "Init"
git push