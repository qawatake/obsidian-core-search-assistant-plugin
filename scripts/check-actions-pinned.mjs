// .github/workflows 内の `uses:` が全て commit SHA (40桁 hex) に pin されているか検査する。
// Dependabot は既存の pin を更新するだけで、新しく足された tag 参照 (例: actions/checkout@v7) は指摘しない。
// tag は後から別の commit に付け替えられるので、review していない code が CI で動くのを防ぐ。
// ローカル action (./path) と docker:// は対象外。pin の更新は `mise run pin-actions:update`。
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = new URL("../.github/workflows/", import.meta.url);
const files = readdirSync(dir).filter((f) => /\.ya?ml$/.test(f));
const errors = [];

for (const file of files) {
  const lines = readFileSync(join(dir.pathname, file), "utf8").split("\n");
  lines.forEach((line, i) => {
    const m = line.match(/^\s*-?\s*uses:\s*["']?([^"'\s#]+)/);
    if (!m) return;
    const ref = m[1];
    if (ref.startsWith("./") || ref.startsWith("docker://")) return;
    if (!/^[\w.-]+\/[\w.-]+(\/[^@]+)?@[0-9a-f]{40}$/.test(ref)) {
      errors.push(`${file}:${i + 1}: ${ref}`);
    }
  });
}

if (errors.length > 0) {
  console.error("actions-pinned: commit SHA に pin されていない action があります:");
  for (const e of errors) console.error(`  ${e}`);
  console.error("  `mise run pin-actions` で pin できます。");
  process.exit(1);
}
console.log(`actions-pinned: ok (${files.length} workflow)`);
