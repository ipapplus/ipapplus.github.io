#!/bin/bash

debs_folder="old"
extracted_folder="tmp"
output_folder="new"

mkdir -p "$extracted_folder"
mkdir -p "$output_folder"

for deb_file in "$debs_folder"/*.deb; do
    if [ -f "$deb_file" ]; then
        file_name=$(basename "$deb_file" .deb)
        current_extract_folder="$extracted_folder/$file_name"
        mkdir -p "$current_extract_folder"
        dpkg-deb -R "$deb_file" "$current_extract_folder"
        dpkg-deb -b "$current_extract_folder" "$output_folder/$file_name.deb"
    fi
done