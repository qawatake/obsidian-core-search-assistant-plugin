// main.js に bundle された package が全て `dependencies` から辿れるか検査する。
// devDependencies に置いたままだと、GitHub の preset auto-triage rule
// ("Dismiss low-impact alerts for development-scoped dependencies") が、利用者の vault に
// 配布されるコードの alert を黙って dismiss する。`pnpm audit --prod` もそれを見ない。
// 入力は `pnpm build` が書く esbuild の metafile (meta.json)。transitive な package は
// 親が `dependencies` にあれば通る (例: svelte -> esm-env)。
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const metaPath = resolve(root, process.argv[2] ?? "meta.json");
if (!existsSync(metaPath)) {
  console.error(`bundled-deps: ${metaPath} がありません。先に \`pnpm build\` を実行してください。`);
  process.exit(1);
}
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const pkg = readJson(join(root, "package.json"));
const meta = readJson(metaPath);

// Node の解決順と同じく、from から上に node_modules/<name> を探す。
function locate(from, name) {
  for (let d = from; ; d = dirname(d)) {
    const p = join(d, "node_modules", name);
    if (existsSync(join(p, "package.json"))) return realpathSync(p);
    if (dirname(d) === d) return undefined;
  }
}

// dependencies から辿れる package の実体 dir
const reachable = new Set();
const queue = Object.keys({ ...pkg.dependencies, ...pkg.optionalDependencies }).map((n) => [root, n]);
while (queue.length > 0) {
  const [from, name] = queue.shift();
  const dir = locate(from, name);
  if (!dir || reachable.has(dir)) continue;
  reachable.add(dir);
  const p = readJson(join(dir, "package.json"));
  for (const n of Object.keys({ ...p.dependencies, ...p.optionalDependencies, ...p.peerDependencies })) {
    queue.push([dir, n]);
  }
}

// bundle された入力を package (名前と実体 dir) にまとめる
const bundled = new Map();
for (const input of Object.keys(meta.inputs)) {
  const abs = resolve(root, input);
  const i = abs.lastIndexOf("/node_modules/");
  if (i < 0) continue;
  const segs = abs.slice(i + "/node_modules/".length).split("/");
  const name = segs[0].startsWith("@") ? `${segs[0]}/${segs[1]}` : segs[0];
  const dir = realpathSync(abs.slice(0, i + "/node_modules/".length + name.length));
  bundled.set(dir, name);
}

const errors = [...bundled].filter(([dir]) => !reachable.has(dir)).map(([, name]) => name);
if (errors.length > 0) {
  console.error("bundled-deps: main.js に bundle されているのに dependencies から辿れない package があります:");
  for (const name of errors) {
    const hint = pkg.devDependencies?.[name] ? " (devDependencies から dependencies に移す)" : "";
    console.error(`  ${name}${hint}`);
  }
  process.exit(1);
}
const names = [...new Set(bundled.values())].sort();
console.log(`bundled-deps: ok (${names.length} package: ${names.join(", ") || "なし"})`);
