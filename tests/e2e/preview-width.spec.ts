import test, { type ElectronApplication, expect, type Page } from '@playwright/test';
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

const PREVIEW_CONTENT = '.modal-container .modal .core-search-assistant_preview-modal_view-container';

/** How far the preview modal can scroll sideways. */
async function horizontalOverflow(window: Page): Promise<number> {
	return window.evaluate(() => {
		const modal = document.querySelector('.modal-container .modal');
		if (!modal) throw new Error('preview modal not found');
		return modal.scrollWidth - modal.clientWidth;
	});
}

test('長い行・コードブロック・表・画像があっても preview は横にスクロールしない', async () => {
	const window = await app.firstWindow();
	await settleVaultWindow(app, window);

	// wide-note だけに当たる語で検索する
	await window.getByLabel('Search', { exact: true }).click();
	const searchInput = window.getByRole('searchbox', { name: 'Search...' });
	await searchInput.fill('widecontent');
	await expect(window.getByRole('button', { name: 'wide-note' })).toBeVisible();

	// 検索結果を選んで preview を開く
	await window.keyboard.press('ArrowDown');
	await window.keyboard.press('Control+Space');
	await expect(window.locator(PREVIEW_CONTENT)).toContainText('wide note');
	await expect(window.locator(`${PREVIEW_CONTENT} .internal-embed img`).first()).toBeVisible();

	await expect
		.poll(() => horizontalOverflow(window), {
			message: 'the preview should not scroll sideways (editing view)',
		})
		.toBeLessThanOrEqual(0);

	// 閲覧モードに切り替えても横にスクロールしない
	await window.keyboard.press('Control+e');
	await expect(window.locator(`${PREVIEW_CONTENT} .markdown-reading-view table`)).toBeVisible();
	await expect(window.locator(`${PREVIEW_CONTENT} .markdown-reading-view .internal-embed img`).first()).toBeVisible();
	await expect
		.poll(() => horizontalOverflow(window), {
			message: 'the preview should not scroll sideways (reading view)',
		})
		.toBeLessThanOrEqual(0);
});
