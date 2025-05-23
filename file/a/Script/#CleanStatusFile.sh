#!/bin/bash

STATUS_FILE="/var/jb/Library/dpkg/status"
TEMP_FILE="/tmp/status_temp"
MARKER_FILE="/tmp/blocks_removed_marker"
REMOVED_PACKAGES_FILE="/tmp/removed_packages"

rm -f "$MARKER_FILE" "$REMOVED_PACKAGES_FILE"

awk -v RS='' -v ORS='\n\n' '
{
    block = $0
    if (index(block, "Status: install ok not-installed") || index(block, "Status: deinstall ok config-files")) {
        system("touch /tmp/blocks_removed_marker")
        match(block, /Package: ([^\n]+)/, arr)
        if (arr[1] != "") {
            print arr[1] > "/tmp/removed_packages"
        }
    } else {
        print block
    }
}' "$STATUS_FILE" > "$TEMP_FILE"

if [ -e "$MARKER_FILE" ]; then
    echo "Removed package blocks:"
    while read -r package; do
        echo "$package"
    done < "$REMOVED_PACKAGES_FILE"

    mv "$TEMP_FILE" "$STATUS_FILE"
else
    echo "Status file is already clean."
fi

rm -f "$TEMP_FILE"
rm -f "$MARKER_FILE"
rm -f "$REMOVED_PACKAGES_FILE"