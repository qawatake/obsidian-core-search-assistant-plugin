// main.js に inject される Svelte の CSS scope class が plugin 固有の prefix を持つか検査する。
// Svelte の既定は `svelte-${hash(filename)}` で、同じ file 構成の他 plugin
// (card-view-switcher など) と衝突し、inject された style が id で重複排除されて
// 相手の CSS が使われてしまう (#149)。
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { id } = JSON.parse(readFileSync(resolve(root, "manifest.json"), "utf8"));
const bundle = readFileSync(resolve(root, process.argv[2] ?? "main.js"), "utf8");

const hashes = [...bundle.matchAll(/\bhash:\s*["'`]([^"'`]+)["'`]/g)].map((m) => m[1]);
if (hashes.length === 0) {
  console.error("css-scope: main.js に inject される style が見つかりません。");
  process.exit(1);
}
const bad = hashes.filter((h) => !h.startsWith(`${id}-`));
if (bad.length > 0) {
  console.error(`css-scope: plugin id (${id}) で prefix されていない scope class: ${bad.join(", ")}`);
  process.exit(1);
}
console.log(`css-scope: ok (${hashes.length} styles)`);
