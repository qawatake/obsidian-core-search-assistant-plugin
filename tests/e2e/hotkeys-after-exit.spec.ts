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

test('検索欄にフォーカスしてすぐ入力しても、Esc のあと他の hotkey が使える', async () => {
	const window = await app.firstWindow();
	await settleVaultWindow(app, window);

	// フォーカス直後 (search mode に入りきる前) に入力する
	await window.getByLabel('Search', { exact: true }).click();
	const searchInput = window.getByRole('searchbox', { name: 'Search...' });
	await searchInput.fill('hoge');
	await expect(window.getByRole('button', { name: 'hoge' })).toBeVisible();

	await window.keyboard.press('Escape');

	// command palette が開ける
	await window.keyboard.press('ControlOrMeta+p');
	await expect(window.locator('.prompt')).toBeVisible();
});
