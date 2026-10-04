import test, { type ElectronApplication, expect } from '@playwright/test';
import {
	closeObsidian,
	launchObsidian,
	settleVaultWindow,
} from '../support/obsidian';

let app: ElectronApplication;

test.beforeEach(async () => {
	app = await launchObsidian();
});

test.afterEach(async () => {
	if (app) await closeObsidian(app);
});

test('検索してカードをクリックするとファイルを開ける', async () => {
	const window = await app.firstWindow();
	// 起動時の modal (vault の信頼確認など) を片付け、plugin の読み込みを待つ
	await settleVaultWindow(app, window);
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
