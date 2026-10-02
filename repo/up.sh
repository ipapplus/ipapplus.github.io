#!/bin/sh
set -eu

cd "$(dirname "$0")"

DEBS_DIR="./debs"
PACKAGES_FILE="./Packages"

mkdir -p "$DEBS_DIR"

import_deb() {
    src="$1"

    package=$(dpkg-deb -f "$src" Package)
    version=$(dpkg-deb -f "$src" Version)
    architecture=$(dpkg-deb -f "$src" Architecture)

    [ -n "$package" ] || exit 1
    [ -n "$version" ] || exit 1
    [ -n "$architecture" ] || exit 1

    filename="${package}_${version}_${architecture}.deb"
    destination="$DEBS_DIR/$filename"

    [ "$src" = "$destination" ] && return

    if [ -e "$destination" ]; then
        rm -f "$src"
        return
    fi

    mv "$src" "$destination"
}

for deb in ./*.deb; do
    [ -f "$deb" ] || continue
    import_deb "$deb"
done

for dir in ./*; do
    [ -d "$dir" ] || continue

    case "$dir" in
        ./debs|./assets|./.git|./tests)
            continue
            ;;
    esac

    [ -f "$dir/DEBIAN/control" ] || continue

    package=$(sed -n 's/^Package:[[:space:]]*//p' "$dir/DEBIAN/control" | head -n 1)
    version=$(sed -n 's/^Version:[[:space:]]*//p' "$dir/DEBIAN/control" | head -n 1)
    architecture=$(sed -n 's/^Architecture:[[:space:]]*//p' "$dir/DEBIAN/control" | head -n 1)

    [ -n "$package" ] || exit 1
    [ -n "$version" ] || exit 1
    [ -n "$architecture" ] || exit 1

    filename="${package}_${version}_${architecture}.deb"
    output="./$filename"

    dpkg-deb --build "$dir" "$output"
    import_deb "$output"
done

for deb in "$DEBS_DIR"/*.deb; do
    [ -f "$deb" ] || continue

    package=$(dpkg-deb -f "$deb" Package)
    version=$(dpkg-deb -f "$deb" Version)
    architecture=$(dpkg-deb -f "$deb" Architecture)

    correct="$DEBS_DIR/${package}_${version}_${architecture}.deb"

    if [ "$deb" != "$correct" ]; then
        if [ -e "$correct" ]; then
            rm -f "$deb"
        else
            mv "$deb" "$correct"
        fi
    fi
done

index=$(mktemp ./Packages.XXXXXX)
trap 'rm -f "$index"' EXIT HUP INT TERM

apt-ftparchive packages ./debs > "$index"
LC_ALL=C perl ./assets/scripts/record-additions.pl "$index"
chmod 644 "$index"
mv "$index" "$PACKAGES_FILE"

trap - EXIT HUP INT TERM

git add --all

if git diff --cached --quiet; then
    exit 0
fi

git commit -m "Update repository"
git push