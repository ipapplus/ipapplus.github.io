#!/bin/bash

BASE_DIR="./debs"
OUTPUT_FILE="Packages"
ARCHS=("rootful" "rootless" "roothide")

for ARCH in "${ARCHS[@]}"; do
    mkdir -p "$BASE_DIR/$ARCH"
done

for deb in ./*.deb; do
    [ -e "$deb" ] || continue

    package=$(dpkg-deb -f "$deb" Package | tr -d '[:space:]')
    version=$(dpkg-deb -f "$deb" Version | tr -d '[:space:]')
    arch=$(dpkg-deb -f "$deb" Architecture | tr -d '[:space:]')

    case "$arch" in
        iphoneos-arm|arm)
            target_dir="rootful"
            ;;
        iphoneos-arm64|arm64)
            target_dir="rootless"
            ;;
        iphoneos-arm64e|arm64e)
            target_dir="roothide"
            ;;
        *)
            continue
            ;;
    esac

    new_name="${package}_${version}_${arch}.deb"
    new_path="$BASE_DIR/$target_dir/$new_name"

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

CRED_HELPER="$(mktemp)"

cat > "$CRED_HELPER" <<'EOF'
#!/bin/bash

STORE="/var/jb/usr/libexec/git-core/git-credential-store"
DATA="$(printf 'protocol=https\nhost=github.com\n\n' | "$STORE" get 2>/dev/null)"

case "$1" in
    *Username*)
        printf '%s\n' "$(printf '%s\n' "$DATA" | sed -n 's/^username=//p')"
        ;;
    *Password*)
        printf '%s\n' "$(printf '%s\n' "$DATA" | sed -n 's/^password=//p')"
        ;;
esac
EOF

chmod +x "$CRED_HELPER"

GIT_ASKPASS="$CRED_HELPER" \
GIT_TERMINAL_PROMPT=0 \
git -c credential.helper= push

rm -f "$CRED_HELPER"