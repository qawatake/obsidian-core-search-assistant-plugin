import test, {
	expect,
	type ElectronApplication,
	_electron as electron,
} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const appPath = path.resolve('./.obsidian-unpacked/main.js');
const vaultPath = path.resolve('./e2e-vault');

let app: ElectronApplication;

test.beforeEach(async () => {
	await fs.rm(path.join(vaultPath, '.obsidian', 'workspace.json'), {
		recursive: true,
		force: true,
	});

	app = await electron.launch({
		args: [
			appPath,
			'open',
			`obsidian://open?path=${encodeURIComponent(vaultPath)}`,
		],
	});

	// Handle JS dialogs (e.g. beforeunload on app close) explicitly.
	// Playwright's implicit auto-dismiss races with Obsidian closing its own
	// dialogs ("No dialog is showing" protocol error), which hangs teardown.
	const handleDialogs = (page) => {
		page.on("dialog", (dialog) => dialog.accept().catch(() => {}));
	};
	app.on("window", handleDialogs);
	for (const page of app.windows()) {
		handleDialogs(page);
	}
});

test.afterEach(async () => {
	// app.close() can hang if Obsidian blocks shutdown (observed with the
	// latest Obsidian in CI), so bound it and force-kill as a fallback.
	await Promise.race([
		app?.close(),
		new Promise((resolve) => setTimeout(resolve, 15_000)),
	]);
	app?.process().kill();
});

test('検索してカードをクリックするとファイルを開ける', async () => {
	const window = await app.firstWindow();
	// サーチボタンをクリック
	await window.getByLabel('Search', { exact: true }).click();

	// 検索ボックスに入力
	const searchInput = window.getByRole('searchbox', { name: 'Search...' });
	await searchInput.fill('hoge');

	// カードをクリック
	await window.getByRole('button', { name: 'hoge' }).click();

	// カードにフォーカスが当たり、カードの内容が表示される
	const focused = window.locator(':focus');
	await expect(focused).toContainText('hogehoge');
	// await new Promise((resolve) => setTimeout(resolve, 500000));
});
