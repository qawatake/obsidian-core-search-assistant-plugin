// 依存更新が「成果物 (= リリース/デプロイで利用者に届くもの) を変えるか」を、推測ではなく
// ビルドして確かめる。web app なら deploy 対象、plugin なら配布される main.js、
// GitHub Action なら commit される dist が成果物。
//
// 成果物が変われば merge 後にリリース/デプロイが要り、変わらなければ merge で終わる。
// この判定が landing-dep-bumps の needs-release / no-release ラベルの根拠になる。
//
//   node artifact-diff.mjs                       # cwd の repo を origin/main..HEAD で比較
//   node artifact-diff.mjs <repo-dir>            # 指定 repo
//   node artifact-diff.mjs <repo-dir> --base origin/main --head my-branch
//   node artifact-diff.mjs <repo-dir> --artifact main.js,styles.css,manifest.json   # 複数は comma 区切り
//
// repo 側の宣言 (package.json)。無ければ既定値を使う:
//   "hardenDeps": { "artifact": ["dist"], "build": "pnpm build", "install": "pnpm install --frozen-lockfile" }
//
// 注意: base と head の worktree で repo の install と build をそのまま実行する。
// 信頼している repo にだけ使う。
//
// exit code: 0 = 成果物は同一 / 1 = 成果物が変わる / 2 = 判定不能 (ビルド失敗・非決定的)
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, extname, join, relative, resolve } from "node:path";

const DEFAULTS = {
  artifact: ["dist"],
  build: "pnpm build",
  install: "pnpm install --frozen-lockfile",
};

const argv = process.argv.slice(2);
const flags = {};
const positional = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith("--")) flags[argv[i].slice(2)] = argv[++i];
  else positional.push(argv[i]);
}

const repo = resolve(positional[0] ?? ".");
const name = basename(repo);
const log = (m) => console.log(`artifact-diff: ${m}`);
const die = (m) => {
  console.error(`artifact-diff: ${m}`);
  process.exit(2);
};

function git(args, cwd = repo) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function config() {
  try {
    const pkg = JSON.parse(readFileSync(join(repo, "package.json"), "utf8"));
    return { ...DEFAULTS, ...(pkg.hardenDeps ?? {}) };
  } catch {
    return DEFAULTS;
  }
}

const cfg = config();
const artifacts = flags.artifact ? flags.artifact.split(",").map((a) => a.trim()).filter(Boolean) : cfg.artifact;
const buildCmd = flags.build ?? cfg.build;
const installCmd = flags.install ?? cfg.install;

let baseRef = flags.base;
if (!baseRef) {
  for (const candidate of ["origin/main", "origin/master", "main", "master"]) {
    try {
      git(["rev-parse", "--verify", "--quiet", candidate]);
      baseRef = candidate;
      break;
    } catch {}
  }
}
if (!baseRef) die("base ref が決まらない。--base で指定する");
const headRef = flags.head ?? "HEAD";

const baseSha = git(["rev-parse", baseRef]);
const headSha = git(["rev-parse", headRef]);
if (baseSha === headSha) die(`base と head が同じ commit (${baseSha.slice(0, 12)})`);

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.isFile()) out.push(full);
  }
  return out;
}

// 成果物を {相対 path -> 中身の sha256} にする。
// path は実際の名前のまま持つ。内容ハッシュ付きの名前 (index-ZE4NK5WK.js) を
// 正規表現で潰すと、ハッシュに `-` が入る形 (index-tz9-vB7b.js) や、本当に
// ハイフンを含む名前と区別できない。名前の対応付けは差分表示のときだけ行う。
function hashArtifact(root) {
  const files = new Map();
  for (const a of artifacts) {
    const target = join(root, a);
    if (!existsSync(target)) die(`成果物が見つからない: ${a} (--artifact か package.json の hardenDeps.artifact で指定する)`);
    const entries = statSync(target).isDirectory() ? walk(target) : [target];
    for (const f of entries) {
      files.set(relative(root, f), createHash("sha256").update(readFileSync(f)).digest("hex"));
    }
  }
  return files;
}

// 内容ハッシュ付きの名前は中身が変わると名前ごと変わるので、消えた path と増えた path を
// 対にして rename として見せる。ハッシュ部分は `-` を含むことがある (index-tz9-vB7b.js) ので
// 区切り位置は決め打ちできない。同じ dir・同じ拡張子の中で、基底名の共通接頭辞が最も長い
// ものを選ぶ。あくまで表示のためで、成果物が変わったという判定には使わない。
function pairRenames(removed, added) {
  const parts = (p) => {
    const b = basename(p);
    const ext = extname(b);
    return { dir: dirname(p), ext, head: b.slice(0, b.length - ext.length) };
  };
  const commonPrefix = (a, b) => {
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    return i;
  };
  const scored = [];
  for (const r of removed) {
    const pr = parts(r);
    for (const a of added) {
      const pa = parts(a);
      if (pa.dir !== pr.dir || pa.ext !== pr.ext) continue;
      const score = commonPrefix(pr.head, pa.head);
      if (score > 0) scored.push({ score, r, a });
    }
  }
  scored.sort((x, y) => y.score - x.score);
  const pairs = [];
  for (const { r, a } of scored) {
    if (!removed.has(r) || !added.has(a)) continue;
    pairs.push([r, a]);
    removed.delete(r);
    added.delete(a);
  }
  return pairs;
}

const overall = (files) => {
  const h = createHash("sha256");
  for (const k of [...files.keys()].sort()) h.update(`${k}\0${files.get(k)}\0`);
  return h.digest("hex");
};

const cacheRoot = join(homedir(), ".cache", "harden-deps-artifact", name);
const worktrees = [];

function buildAt(sha, tag) {
  const dir = join(cacheRoot, `${tag}-${sha.slice(0, 12)}`);
  rmSync(dir, { recursive: true, force: true });
  git(["worktree", "add", "--detach", dir, sha]);
  worktrees.push(dir);
  log(`${tag}: ${sha.slice(0, 12)} を build`);
  try {
    execFileSync("sh", ["-c", installCmd], { cwd: dir, stdio: "pipe" });
    execFileSync("sh", ["-c", buildCmd], { cwd: dir, stdio: "pipe" });
  } catch (e) {
    console.error(String(e.stderr ?? e.stdout ?? e.message).slice(-2000));
    die(`${tag} のビルドに失敗した`);
  }
  return hashArtifact(dir);
}

function cleanup() {
  for (const d of worktrees) {
    try {
      git(["worktree", "remove", "--force", d]);
    } catch {
      rmSync(d, { recursive: true, force: true });
    }
  }
}

process.on("exit", cleanup);

log(`repo=${name} base=${baseRef} head=${headRef} artifact=${artifacts.join(",")}`);
const baseFiles = buildAt(baseSha, "base");
const headFiles = buildAt(headSha, "head");
const baseHash = overall(baseFiles);
const headHash = overall(headFiles);
log(`base ${artifacts.join(",")} sha256 ${baseHash.slice(0, 16)}`);
log(`head ${artifacts.join(",")} sha256 ${headHash.slice(0, 16)}`);

if (baseHash === headHash) {
  log("=> 成果物は同一。リリース/デプロイは不要 (no-release)");
  process.exit(0);
}

// 差が出たときだけ、それがビルドの非決定性ではないことを確かめる。
// ここを飛ばすと、毎回変わるビルドを「更新のせい」と誤読する。
log("差が出たので base をもう一度 build して、ビルドが決定的か確かめる");
if (overall(buildAt(baseSha, "base2")) !== baseHash) {
  console.error("artifact-diff: base を 2 回 build して成果物が一致しない = ビルドが非決定的");
  console.error("artifact-diff: 先に非決定性 (timestamp / 並び順 / 埋め込まれた path など) を潰す。判定不能");
  process.exit(2);
}

const removed = new Set([...baseFiles.keys()].filter((k) => !headFiles.has(k)));
const added = new Set([...headFiles.keys()].filter((k) => !baseFiles.has(k)));
for (const [from, to] of pairRenames(removed, added)) log(`  R ${from} -> ${to}`);
for (const k of [...baseFiles.keys()].sort()) {
  if (headFiles.has(k) && headFiles.get(k) !== baseFiles.get(k)) log(`  M ${k}`);
}
for (const k of [...removed].sort()) log(`  D ${k}`);
for (const k of [...added].sort()) log(`  A ${k}`);
log("=> 成果物が変わる。merge 後にリリース/デプロイが要る (needs-release)");
process.exit(1);
