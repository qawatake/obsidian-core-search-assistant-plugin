// 設定ファイルの $schema に埋め込まれた version が、package.json の依存 version と一致するか検査する。
// Dependabot / Renovate は package.json と lockfile しか書き換えないので、`biome.jsonc` の
// "https://biomejs.dev/schemas/<version>/schema.json" のような参照は bump のたびに取り残される。
// tool 本体は古い schema でも動く (info 診断が出るだけ) ので CI は緑のまま、エディタ補完と
// 設定検証だけが古い schema を見続ける。ここで止める。
//
//   node scripts/check-config-schema.mjs          # repo root (script の 1 つ上) を検査
//   node scripts/check-config-schema.mjs <dir>    # 指定 dir を検査 (scan-repos.sh 用)
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.argv[2]
  ? pathToFileURL(`${resolve(process.argv[2])}/`)
  : new URL("../", import.meta.url);

// $schema の URL から package 名と version を取り出す規則。
// 1 つ目は host ごとの個別規則、2 つ目は CDN の URL から package 名がそのまま読めるもの。
const RULES = [
  { re: /^https?:\/\/biomejs\.dev\/schemas\/(\d[\w.-]*)\/schema\.json$/, pkg: "@biomejs/biome" },
  {
    re: /^https?:\/\/(?:unpkg\.com|cdn\.jsdelivr\.net\/npm)\/((?:@[^/@]+\/)?[^/@]+)@(\d[\w.-]*)\//,
    pkgFromUrl: true,
  },
];

function readIfExists(name) {
  try {
    return readFileSync(new URL(name, root), "utf8");
  } catch {
    return undefined;
  }
}

const pkgJson = readIfExists("package.json");
if (!pkgJson) {
  console.error("config-schema: package.json が見つからない");
  process.exit(1);
}
const pkg = JSON.parse(pkgJson);
const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };

// repo 直下の *.json / *.jsonc を対象にする (package.json と lockfile は除く)。
const targets = readdirSync(root)
  .filter((f) => /\.jsonc?$/.test(f) && f !== "package.json" && f !== "package-lock.json")
  .sort();

const errors = [];
const checked = [];

for (const file of targets) {
  const text = readIfExists(file);
  // JSONC を parse せずに済ませる。$schema はどの tool でも文字列 1 つ
  const url = text?.match(/"\$schema"\s*:\s*"([^"]+)"/)?.[1];
  if (!url) continue;

  for (const rule of RULES) {
    const m = url.match(rule.re);
    if (!m) continue;
    const name = rule.pkgFromUrl ? m[1] : rule.pkg;
    const schemaVersion = rule.pkgFromUrl ? m[2] : m[1];
    const range = deps[name];
    // 依存に無い tool の schema (schemastore など) は対象外
    if (!range) break;
    const declared = range.replace(/^[\^~>=< ]+/, "");
    // URL 側が "5" のように粗いこともあるので、URL に書かれている桁数だけ比べる
    const depth = schemaVersion.split(".").length;
    const left = declared.split(".").slice(0, depth).join(".");
    if (left !== schemaVersion) {
      errors.push(`${file} の $schema が ${name} とずれている: $schema=${schemaVersion} package.json=${declared}`);
    }
    checked.push(`${file} -> ${name}@${schemaVersion}`);
    break;
  }
}

if (errors.length > 0) {
  for (const e of errors) console.error(`config-schema: ${e}`);
  console.error("config-schema: tool の migrate コマンド (例: pnpm exec biome migrate --write) で追随させる");
  process.exit(1);
}
console.log(`config-schema: ok (${checked.length > 0 ? checked.join(", ") : "対象なし"})`);
