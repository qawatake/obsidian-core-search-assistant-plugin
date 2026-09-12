// mise.toml と package.json の toolchain version が一致するか検査する。
// Dependabot は mise.toml を扱えないので、pnpm / Node を上げるときは両方を手で更新する必要がある。
// ずれると CI (mise) とローカル (packageManager / engines) で違う version が動くので、ここで止める。
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const mise = readFileSync(new URL("../mise.toml", import.meta.url), "utf8");

function miseTool(name) {
  const tools = mise.match(/^\[tools\]\n([\s\S]*?)(?=^\[|(?![\s\S]))/m)?.[1] ?? "";
  return tools.match(new RegExp(`^${name}\\s*=\\s*"([^"]+)"`, "m"))?.[1];
}

const errors = [];

const pnpmFromPkg = pkg.packageManager?.match(/^pnpm@(\d+\.\d+\.\d+)$/)?.[1];
const pnpmFromMise = miseTool("pnpm");
if (!pnpmFromPkg)
  errors.push(`package.json の packageManager が "pnpm@x.y.z" 形式ではない: ${pkg.packageManager}`);
if (!pnpmFromMise) errors.push("mise.toml の [tools] に pnpm がない");
if (pnpmFromPkg && pnpmFromMise && pnpmFromPkg !== pnpmFromMise) {
  errors.push(`pnpm version がずれている: package.json=${pnpmFromPkg} mise.toml=${pnpmFromMise}`);
}

// engines.node は ">=24.0.0" / ">=24" / "24.x" のどれでも major だけ見る
const nodeMajorFromPkg = pkg.engines?.node?.match(/(\d+)/)?.[1];
const nodeFromMise = miseTool("node");
if (!nodeMajorFromPkg)
  errors.push(`package.json の engines.node から major を読めない: ${pkg.engines?.node}`);
if (!nodeFromMise) errors.push("mise.toml の [tools] に node がない");
if (nodeMajorFromPkg && nodeFromMise && nodeFromMise.split(".")[0] !== nodeMajorFromPkg) {
  errors.push(`Node major がずれている: package.json engines=${nodeMajorFromPkg} mise.toml=${nodeFromMise}`);
}

const typesNodeMajor = pkg.devDependencies?.["@types/node"]?.match(/(\d+)/)?.[1];
if (typesNodeMajor && nodeMajorFromPkg && typesNodeMajor !== nodeMajorFromPkg) {
  errors.push(`@types/node の major がずれている: @types/node=${typesNodeMajor} engines=${nodeMajorFromPkg}`);
}

if (errors.length > 0) {
  for (const e of errors) console.error(`toolchain: ${e}`);
  process.exit(1);
}
console.log(`toolchain: ok (pnpm ${pnpmFromPkg}, node ${nodeFromMise})`);
