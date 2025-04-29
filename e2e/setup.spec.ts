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
	const window = await app.firstWindow();

	// Obsidian 側で 'did-finish-load' が発火するまで待つ
	await window.waitForEvent("domcontentloaded");
	// --- スタブ ---
	await app.evaluate(async ({ dialog }, fakePath) => {
		// const { dialog } = require("electron");
		console.log("hoge");
		// const { dialog } = require("electron") as typeof import("electron");
		dialog.showOpenDialog = async () => {
			// sleep 3s
			console.log("😍");
			return Promise.resolve({
				canceled: false,
				filePaths: [fakePath],
			});
		};
		dialog.showOpenDialogSync = () => {
			console.log("😌");
			return [fakePath];
		};
	}, vaultPath);

	// ---------------
	await new Promise((resolve) => setTimeout(resolve, 1000));
	const openButton = window.getByRole("button", { name: "Open" });
	await openButton.waitFor({ state: "visible" });
	await openButton.click();
	console.log("😀🥵");
	await new Promise((resolve) => setTimeout(resolve, 1000));
	console.log(app.windows().length);
	await new Promise((resolve) => setTimeout(resolve, 1000));

	// Trust the author of the vault
	await window.getByRole("button", { name: /trust author/i }).click();
	// const vaultInput = await window.waitForSelector("input");
	// console.log(vaultInput);
	await new Promise((resolve) => setTimeout(resolve, 500000));
	// await vaultInput.setInputFiles(vaultPath);
	// サーチボタンをクリック
	await window.getByLabel("Search", { exact: true }).click();

	// 検索ボックスに入力
	const searchInput = window.getByRole("searchbox", { name: "Search..." });
	await searchInput.fill("hoge");

	// カードをクリック
	await window.getByRole("button", { name: "hoge" }).click();

	// カードにフォーカスが当たり、カードの内容が表示される
	const focused = window.locator(":focus");
	await expect(focused).toContainText("hogehoge");
	// await new Promise((resolve) => setTimeout(resolve, 500000));
});
