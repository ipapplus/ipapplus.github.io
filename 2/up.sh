#!/bin/sh
set -eu

cd "$(dirname "$0")"

DEBS_DIR="./debs"
PACKAGES_FILE="./Packages"

mkdir -p "$DEBS_DIR"

import_deb() {
    src="$1"

    metadata=$(dpkg-deb -f "$src" Package Version Architecture)

    package=$(printf '%s\n' "$metadata" | sed -n 's/^Package:[[:space:]]*//p')
    version=$(printf '%s\n' "$metadata" | sed -n 's/^Version:[[:space:]]*//p')
    architecture=$(printf '%s\n' "$metadata" | sed -n 's/^Architecture:[[:space:]]*//p')

    [ -n "$package" ] || exit 1
    [ -n "$version" ] || exit 1
    [ -n "$architecture" ] || exit 1

    filename="${package}_${version}_${architecture}.deb"
    destination="$DEBS_DIR/$filename"

    if [ -e "$destination" ]; then
        rm -f "$src"
        return
    fi

    mv "$src" "$destination"
}

remove_dir() {
    dir="$1"

    if rm -rf -- "$dir" 2>/dev/null; then
        return
    fi

    if chmod -R u+rwX -- "$dir" 2>/dev/null && rm -rf -- "$dir" 2>/dev/null; then
        return
    fi

    sudo chmod -R u+rwX -- "$dir"
    sudo rm -rf -- "$dir"
}

for deb in ./*.deb; do
    [ -f "$deb" ] || continue
    import_deb "$deb"
done

for dir in ./*; do
    [ -d "$dir" ] || continue

    case "$dir" in
        ./debs|./.git|./tests)
            continue
            ;;
    esac

    control="$dir/DEBIAN/control"
    [ -f "$control" ] || continue

    metadata=$(sed -n \
        -e 's/^Package:[[:space:]]*/Package: /p' \
        -e 's/^Version:[[:space:]]*/Version: /p' \
        -e 's/^Architecture:[[:space:]]*/Architecture: /p' \
        "$control")

    package=$(printf '%s\n' "$metadata" | sed -n 's/^Package:[[:space:]]*//p' | head -n 1)
    version=$(printf '%s\n' "$metadata" | sed -n 's/^Version:[[:space:]]*//p' | head -n 1)
    architecture=$(printf '%s\n' "$metadata" | sed -n 's/^Architecture:[[:space:]]*//p' | head -n 1)

    [ -n "$package" ] || exit 1
    [ -n "$version" ] || exit 1
    [ -n "$architecture" ] || exit 1

    filename="${package}_${version}_${architecture}.deb"
    output="./$filename"

    dpkg-deb --build "$dir" "$output"
    import_deb "$output"
    remove_dir "$dir"
done

index=$(mktemp ./Packages.XXXXXX)
trap 'rm -f "$index"' EXIT HUP INT TERM

apt-ftparchive packages "$DEBS_DIR" > "$index"
LC_ALL=C perl ./record-additions.pl "$index"
chmod 644 "$index"
mv "$index" "$PACKAGES_FILE"

trap - EXIT HUP INT TERM

git add --all

if ! git diff --cached --quiet; then
    git commit -m "Update repository"
fi

git push