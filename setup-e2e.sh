#!/usr/bin/env bash

# 参考
# https://github.com/proog/obsidian-trash-explorer

set -eu -o pipefail

root_path=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)

obsidian_app_path="${1:-/Applications/Obsidian.app}"
vault_path="$root_path/e2e-vault"
obsidian_unpacked_path="$root_path/.obsidian-unpacked"
plugin_path="$vault_path/.obsidian/plugins/obsidian-core-search-assistant"

if [ ! -e "$obsidian_app_path" ]; then
    echo "Obsidian not found at $obsidian_app_path. Make sure Obsidian is installed."
    exit 1
fi

if [ ! -d "$vault_path" ]; then
    echo "Test vault not found at $vault_path. Make sure this script is running from the root of the repository."
    exit 2
fi

echo
echo "Unpacking Obsidian from $obsidian_app_path to $obsidian_unpacked_path..."
rm -rf "$obsidian_unpacked_path"
npx @electron/asar extract "$obsidian_app_path/Contents/Resources/app.asar" "$obsidian_unpacked_path"
cp -f "$obsidian_app_path/Contents/Resources/obsidian.asar" "$obsidian_unpacked_path/obsidian.asar"
echo "Done."

echo
echo "Building plugin..."
npm run build
echo "Done."

echo
echo "Linking built plugin to $plugin_path..."
mkdir -p "$plugin_path"
ln -fs "$root_path/manifest.json" "$plugin_path/manifest.json"
ln -fs "$root_path/main.js" "$plugin_path/main.js"
echo "Done."

echo
echo "Obsidian will now start. Please"
echo "  - open $vault_path as a vault,"
echo "  - enable community plugins,"
echo "then close Obsidian."
echo
# read -rp "Press [ENTER] to continue..."
npx electron "$obsidian_unpacked_path/main.js" &>/dev/null
echo "Done."
