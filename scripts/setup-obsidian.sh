#!/usr/bin/env bash
#
# Obsidian を展開して E2E テスト用ディレクトリを用意するスクリプト（macOS 専用）
# Reference: https://github.com/proog/obsidian-trash-explorer/blob/4d9bc2c4977d79af116b369904c8f68d1c164b28/e2e-setup.sh
#
# - ローカル           : /Applications/Obsidian.app をそのまま展開
# - GitHub Actions    : GitHub Releases から .dmg を取得して展開
#
# USAGE (local) : ./scripts/setup-obsidian.sh
# USAGE (ci)    : ./scripts/setup-obsidian.sh --ci
#
# 環境変数
#   OBSIDIAN_VERSION  固定バージョンを指定（例 1.8.10）。未設定なら latest
#   OBSIDIAN_PATH     ローカルの Obsidian.app のパスを上書き
#
set -euo pipefail

root_path="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
vault_path="$root_path/e2e-vault"
unpacked_path="$root_path/.obsidian-unpacked"
plugin_path="$vault_path/.obsidian/plugins/obsidian-core-search-assistant"

# ------------------------------------------------------------------------------
# 1. 引数パース
# ------------------------------------------------------------------------------
MODE="local"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --ci) MODE="ci";;
    *)    echo "Unknown arg: $1" >&2; exit 1;;
  esac
  shift
done

# ------------------------------------------------------------------------------
# 2. Obsidian.app の取得
# ------------------------------------------------------------------------------
if [[ "$MODE" == "local" ]]; then
  obsidian_app="${OBSIDIAN_PATH:-/Applications/Obsidian.app}"
  [[ -d "$obsidian_app" ]] || {
    echo "❌ $obsidian_app が見つかりません。Obsidian をインストールしてください。" >&2
    exit 1
  }
else
  tmp_dir="$(mktemp -d)"
  version="${OBSIDIAN_VERSION:-latest}"
  pattern="Obsidian-*.dmg"

  if [[ "$version" == "latest" ]]; then
    # The newest release does not always ship desktop assets (e.g. a mobile-only
    # release carries just an .apk), so pick the newest stable release that
    # actually has a macOS dmg instead of trusting GitHub's "latest".
    tag="$(gh api "repos/obsidianmd/obsidian-releases/releases?per_page=30" \
      --jq "[.[] | select(.draft | not) | select(.prerelease | not)
             | select(any(.assets[].name; test(\"^Obsidian-.*\\\\.dmg$\")))][0].tag_name // empty")"
    [[ -n "$tag" ]] || { echo "❌ no stable release with a macOS dmg found" >&2; exit 1; }
  else
    tag="v${version}"
  fi

  echo "⏬ Downloading Obsidian ($tag) dmg via gh CLI"
  gh release download "$tag" -R obsidianmd/obsidian-releases \
    --pattern "$pattern" --dir "$tmp_dir"

  dmg_path="$(find "$tmp_dir" -name '*.dmg' -type f | head -n1)"
  [[ -n "$dmg_path" ]] || { echo "❌ .dmg が見つかりません" >&2; exit 1; }

  echo "📦 Mounting $(basename "$dmg_path")"
  mnt_dir="$tmp_dir/mnt"
  mkdir "$mnt_dir"
  hdiutil attach "$dmg_path" -mountpoint "$mnt_dir" -nobrowse -quiet
  trap 'hdiutil detach "$mnt_dir" -quiet || true' EXIT

  cp -R "$mnt_dir/Obsidian.app" "$tmp_dir/Obsidian.app"
  obsidian_app="$tmp_dir/Obsidian.app"

  hdiutil detach "$mnt_dir" -quiet
  trap - EXIT
fi

# ------------------------------------------------------------------------------
# 2b. Electron drift check
# ------------------------------------------------------------------------------
# The e2e tests run Obsidian's sources on the npm `electron` binary, not on the
# one inside Obsidian.app, so the devDependency should track the major that
# Obsidian bundles. Dependabot bumps majors on its own (after cooldown); this
# only warns when the two have drifted apart so a human can decide.
obsidian_electron="$(plutil -extract CFBundleVersion raw -o - \
  "$obsidian_app/Contents/Frameworks/Electron Framework.framework/Resources/Info.plist")"
our_electron="$(node -p "require('electron/package.json').version")"
if [[ "${obsidian_electron%%.*}" != "${our_electron%%.*}" ]]; then
  msg="Electron major mismatch: Obsidian $(defaults read "$obsidian_app/Contents/Info.plist" CFBundleShortVersionString) bundles Electron $obsidian_electron but devDependency electron is $our_electron. Consider bumping electron to ${obsidian_electron%%.*}.x in package.json."
  if [[ "$MODE" == "ci" ]]; then
    echo "::warning title=Electron drift::$msg"
  else
    echo "⚠️  $msg" >&2
  fi
else
  echo "✅ Electron $our_electron matches Obsidian's bundled major ($obsidian_electron)"
fi

# ------------------------------------------------------------------------------
# 3. app.asar を展開してテスト用フォルダ構築
# ------------------------------------------------------------------------------
echo "🔓 Unpacking $obsidian_app → $unpacked_path"
rm -rf "$unpacked_path"
pnpm exec asar extract \
    "$obsidian_app/Contents/Resources/app.asar" "$unpacked_path"
cp "$obsidian_app/Contents/Resources/obsidian.asar" \
   "$unpacked_path/obsidian.asar"

echo "✅ Obsidian unpacked"

# ------------------------------------------------------------------------------
# 4. プラグインをビルドして Vault にリンク
# ------------------------------------------------------------------------------
echo "🔧 Building plugin…"
pnpm build --silent
echo "✅ Build done."

echo "🔗 Linking plugin → $plugin_path"
mkdir -p "$plugin_path"
ln -fs "$root_path/manifest.json" "$plugin_path/manifest.json"
ln -fs "$root_path/main.js"       "$plugin_path/main.js"
ln -fs "$root_path/styles.css"    "$plugin_path/styles.css"

echo "🎉 setup-obsidian.sh finished!"
