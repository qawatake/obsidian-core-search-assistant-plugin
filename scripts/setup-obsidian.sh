#!/usr/bin/env bash
#
# macOS では既存の /Applications/Obsidian.app を、
# CI (Linux) では GitHub Releases から最新 AppImage を取ってきて unpack する。
#
# USAGE (macOS) : ./scripts/setup-obsidian.sh
# USAGE (CI)    : ./scripts/setup-obsidian.sh --ci
# 環境変数      : OBSIDIAN_VERSION=1.8.0 のように渡すと固定バージョンで落とす

set -euo pipefail

root_path="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
vault_path="$root_path/e2e-vault"
unpacked_path="$root_path/.obsidian-unpacked"
plugin_path="$vault_path/.obsidian/plugins/obsidian-core-search-assistant"

# ---- 引数パース -------------------------------------------------------------
MODE="local"   # default
while [[ $# -gt 0 ]]; do
  case "$1" in
    --ci) MODE="ci"; shift ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done
# ---------------------------------------------------------------------------

# ==== 1. Obsidian の入手 / 展開 =============================================
if [[ "$MODE" == "local" ]]; then
  obsidian_app_path="${OBSIDIAN_PATH:-/Applications/Obsidian.app}"

  if [[ ! -d "$obsidian_app_path" ]]; then
    echo "❌  $obsidian_app_path が見つかりません。Obsidian をインストールしてください。"
    exit 1
  fi

  echo "⏬ Unpacking Obsidian.app → $unpacked_path"
  rm -rf "$unpacked_path"
  npx --yes @electron/asar extract \
      "$obsidian_app_path/Contents/Resources/app.asar" "$unpacked_path"
  cp -f "$obsidian_app_path/Contents/Resources/obsidian.asar" \
        "$unpacked_path/obsidian.asar"

else   # ---- CI / Linux ------------------------------------------------------
  tmp_dir="$(mktemp -d)"
  version="${OBSIDIAN_VERSION:-latest}"

  echo "⏬ Downloading Obsidian ($version, AppImage)…"
  if [[ "$version" == "latest" ]]; then
    api="https://api.github.com/repos/obsidianmd/obsidian-releases/releases/latest"
  else
    api="https://api.github.com/repos/obsidianmd/obsidian-releases/releases/tags/v${version}"
  fi

  asset_url=$(curl -sL "$api" |
    jq -r '.assets[] | select(.name|test("^Obsidian-.*\\.AppImage$")) |
           .browser_download_url')

  curl -L "$asset_url" -o "$tmp_dir/Obsidian.AppImage"
  chmod +x "$tmp_dir/Obsidian.AppImage"

  echo "📦 Extracting AppImage squashfs → $unpacked_path"
  (cd "$tmp_dir" && ./Obsidian.AppImage --appimage-extract >/dev/null)
  # squashfs-root/resources/{app.asar,obsidian.asar}
  rm -rf "$unpacked_path"
  npx --yes @electron/asar extract \
      "$tmp_dir/squashfs-root/resources/app.asar" "$unpacked_path"
  cp "$tmp_dir/squashfs-root/resources/obsidian.asar" "$unpacked_path/obsidian.asar"
fi
echo "✅ Unpack done."

# ==== 2. プラグインビルド ====================================================
echo "🔧 Building plugin…"
npm run build --silent
echo "✅ Build done."

# ==== 3. Vault へリンク ======================================================
echo "🔗 Linking plugin → $plugin_path"
mkdir -p "$plugin_path"
ln -fs "$root_path/manifest.json" "$plugin_path/manifest.json"
ln -fs "$root_path/main.js"       "$plugin_path/main.js"
echo "🎉 All set!"
