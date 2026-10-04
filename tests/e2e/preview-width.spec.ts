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

	// The editor only renders the lines near the viewport, so in a small window
	// the table and the image at the end of the note are not in the DOM yet.
	// Check the top of the note, then scroll to the end and check that too.
	await expectNoHorizontalOverflow(window, 'editing view, top');
	await scrollPreviewToBottom(window);
	await expect(window.locator(`${PREVIEW_CONTENT} .internal-embed img`).first()).toBeVisible();
	await expectNoHorizontalOverflow(window, 'editing view, bottom');

	// 閲覧モードに切り替えても横にスクロールしない
	await window.keyboard.press('Control+e');
	await expect(window.locator(`${PREVIEW_CONTENT} .markdown-reading-view`)).toBeVisible();
	await scrollPreviewToBottom(window);
	await expect(window.locator(`${PREVIEW_CONTENT} .markdown-reading-view table`)).toBeVisible();
	await expect(window.locator(`${PREVIEW_CONTENT} .markdown-reading-view .internal-embed img`).first()).toBeVisible();
	await expectNoHorizontalOverflow(window, 'reading view');
});

async function expectNoHorizontalOverflow(window: Page, where: string) {
	await expect
		.poll(() => horizontalOverflow(window), {
			message: `the preview should not scroll sideways (${where})`,
		})
		.toBeLessThanOrEqual(0);
}

/** Scroll the preview modal (the scroll container) to the end of the note. */
async function scrollPreviewToBottom(window: Page) {
	await window.evaluate(() => {
		const modal = document.querySelector('.modal-container .modal');
		if (!modal) throw new Error('preview modal not found');
		modal.scrollTop = modal.scrollHeight;
	});
}
