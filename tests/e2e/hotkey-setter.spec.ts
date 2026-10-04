import test, { type ElectronApplication, expect } from '@playwright/test';
import {
	closeObsidian,
	findSettingsWindow,
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

test('hotkey の追加ボタンを2回押してから Esc でやめても、キー入力が効く', async () => {
	const window = await app.firstWindow();
	await settleVaultWindow(app, window);

	await window.evaluate((id) => {
		// biome-ignore lint/suspicious/noExplicitAny: Obsidian internal API
		const setting = (globalThis as any).app.setting;
		setting.open();
		setting.openTabById(id);
	}, 'obsidian-core-search-assistant-plugin');
	// Settings may open in its own window
	await expect.poll(async () => (await findSettingsWindow(app)) !== undefined).toBe(true);
	const settings = await findSettingsWindow(app);
	if (!settings) throw new Error('Settings not found');

	// 同じ action の追加ボタンを、キーを押さずに2回押してから Esc でやめる
	const addButton = settings.locator('[aria-label="Customize this action"]').first();
	await addButton.click();
	await addButton.click();
	await settings.keyboard.press('Escape');

	// Hotkeys タブの絞り込み欄に文字が打てる
	await window.evaluate(() => {
		// biome-ignore lint/suspicious/noExplicitAny: Obsidian internal API
		(globalThis as any).app.setting.openTabById('hotkeys');
	});
	const filter = settings.locator('.vertical-tab-content input').first();
	await filter.click();
	await settings.keyboard.type('abc');
	await expect(filter).toHaveValue('abc');
});
