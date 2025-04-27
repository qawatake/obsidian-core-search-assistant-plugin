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
});

test.afterEach(async () => {
	await app?.close();
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
