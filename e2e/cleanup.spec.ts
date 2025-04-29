import test, {
	expect,
	type ElectronApplication,
	_electron as electron,
} from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const appPath = path.resolve("./.obsidian-unpacked/main.js");
const vaultPath = path.resolve("./e2e-vault");

let app: ElectronApplication;

test.beforeEach(async () => {
	await fs.rm(path.join(vaultPath, ".obsidian", "workspace.json"), {
		recursive: true,
		force: true,
	});

	app = await electron.launch({
		args: [
			appPath,
			"open",
			// `obsidian://open?path=${encodeURIComponent(vaultPath)}`,
		],
	});
});

test.afterEach(async () => {
	await app?.close();
});

test("検索してカードをクリックするとファイルを開ける", async () => {
	let window = await app.firstWindow();

	// コマンドパレットを開く
	await window.getByLabel("Open command palette", { exact: true }).click();

	// コマンドパレットに入力
	const commandPalette = window.locator(":focus");
	await commandPalette.fill("open another vault");
	// await commandPalette.press("Enter");

	const x = await Promise.all([
		app.waitForEvent("window"), // ❶ 'window' イベントは新しい Page を返す :contentReference[oaicite:0]{index=0}
		commandPalette.press("Enter"), // ❷ 'Enter' キーを押す :contentReference[oaicite:0]{index=1}
	]);
	window = x[0];
	console.log(app.windows().length);
	for (const w of app.windows()) {
		console.log(w.url());
	}
	const w = app.windows().find((w) => w.url().includes("starter"));
	if (!w) {
		throw new Error("not found");
	}
	// const se
	// const originalWindow = window;
	// await originalWindow.close();
	window = w;
	// window

	const originalWindow = app
		.windows()
		.find((w) => !w.url().includes("starter"));
	await originalWindow?.close();
	await window
		.getByLabel("obsidian-core-search-assistant-plugin/e2e-vault")
		.getByLabel("More options", { exact: true })
		.click();
	await window.getByText("Remove from list").click();
	// await window.getByLabel("More options", { exact: true }).click();
	// await new Promise((resolve) => setTimeout(resolve, 100 * 1000));
});
