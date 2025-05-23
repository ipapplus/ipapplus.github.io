#!/bin/bash

source_file="/var/jb/var/root/Library/Preferences/com.ivanobilenchi.icleaner.plist"
destination_folder="/var/jb/var/mobile/Library/Preferences/"
destination_file="com.ivanobilenchi.icleaner.plist"

if [ -e "$source_file" ]; then
    ln -sf "$source_file" "$destination_folder$destination_file"
    echo "Symlink created successfully."
else
    echo "Source file does not exist."
fi