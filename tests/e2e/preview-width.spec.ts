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
	// The note text shows up as soon as the file is opened, but the preview is
	// still loading: switching the view to the editing mode and highlighting the
	// matches come after, and they move the scroll position back near the top.
	// Scrolled before that, the preview ends up at the top again and the end of
	// the note never gets rendered (#170). Highlighting is the last step.
	await expect(window.locator(`${PREVIEW_CONTENT} .highlight-search-match`).first()).toBeVisible();

	// The editor only renders the lines near the viewport, so in a small window
	// the table and the image at the end of the note are not in the DOM yet.
	// Check the top of the note, then scroll to the end and check that too.
	await expectNoHorizontalOverflow(window, 'editing view, top');
	await scrollPreviewToEndOf(window, `${PREVIEW_CONTENT} .markdown-source-view .cm-content`);
	await expect(window.locator(`${PREVIEW_CONTENT} .internal-embed img`).first()).toBeVisible();
	await expectNoHorizontalOverflow(window, 'editing view, bottom');

	// 閲覧モードに切り替えても横にスクロールしない
	await window.keyboard.press('Control+e');
	await expect(window.locator(`${PREVIEW_CONTENT} .markdown-reading-view`)).toBeVisible();
	await scrollPreviewToEndOf(window, `${PREVIEW_CONTENT} .markdown-reading-view .markdown-preview-sizer`);
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

/**
 * Scroll the preview modal (the scroll container) so that the end of the note,
 * the bottom of `content` without its padding, is at the bottom of the modal.
 *
 * Not to the bottom of the modal: the editor pads its content at the bottom
 * so that it can scroll past the end. Scrolled down there, it sees only blank
 * space in view and renders just the last (empty) line, so whether the image
 * right above is in the DOM depends on the editor's height estimates (#170).
 * And the note keeps changing height for a moment: the editor estimates the
 * height of the lines it has not rendered yet, and corrects it once they are.
 * So scroll again until the end of the note stays at the bottom.
 */
async function scrollPreviewToEndOf(window: Page, content: string) {
	await expect
		.poll(
			() =>
				window.evaluate(async (selector) => {
					const modal = document.querySelector('.modal-container .modal');
					const contentEl = document.querySelector(selector);
					if (!modal || !contentEl) throw new Error('preview content not found');
					// the end of the note, above the padding of `content`
					const gap = () =>
						contentEl.getBoundingClientRect().bottom -
						Number.parseFloat(getComputedStyle(contentEl).paddingBottom) -
						modal.getBoundingClientRect().bottom;
					modal.scrollTop += gap();
					// let the editor measure and render what came into view
					await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
					return Math.abs(gap());
				}, content),
			{ message: 'the end of the note should stay at the bottom of the preview' },
		)
		.toBeLessThanOrEqual(1);
}
