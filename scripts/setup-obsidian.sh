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
fi

if [[ "$MODE" == "ci" ]]; then
  sudo apt-get update -y && sudo apt-get install -y gh   # ← GH CLI を入れる

  tmp_dir="$(mktemp -d)"
  version="${OBSIDIAN_VERSION:-latest}"
  pattern="Obsidian-*.AppImage"

  echo "⏬ Downloading Obsidian ($version, pattern=$pattern) via gh CLI"
  echo ${version:+v$version}
  # tag を省略すると latest、渡せばピン留め
  gh release download \
      -R obsidianmd/obsidian-releases \
      --pattern "$pattern" \
      --dir "$tmp_dir"

  appimage=$(find "$tmp_dir" -maxdepth 1 -name "*.AppImage" -type f | head -n 1)
  chmod +x "$appimage"

  echo "📦 Extracting AppImage squashfs → $unpacked_path"
  (cd "$tmp_dir" && "$appimage" --appimage-extract >/dev/null)

  rm -rf "$unpacked_path"
  npx --yes @electron/asar extract \
      "$tmp_dir/squashfs-root/resources/app.asar" "$unpacked_path"
  cp "$tmp_dir/squashfs-root/resources/obsidian.asar" \
     "$unpacked_path/obsidian.asar"
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
