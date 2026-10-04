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

/** How far the preview content has moved up inside the preview modal. */
async function previewScrollOffset(window: Page): Promise<number> {
	return window.evaluate((selector) => {
		const modal = document.querySelector('.modal-container .modal');
		const content = document.querySelector(selector);
		if (!modal || !content) throw new Error('preview modal not found');
		return (
			modal.getBoundingClientRect().top - content.getBoundingClientRect().top
		);
	}, PREVIEW_CONTENT);
}

/** The scroll offset once the preview has stopped moving. */
async function settledScrollOffset(window: Page): Promise<number> {
	let last = await previewScrollOffset(window);
	for (;;) {
		await window.waitForTimeout(200);
		const current = await previewScrollOffset(window);
		if (Math.abs(current - last) < 1) return current;
		last = current;
	}
}

for (const { name, down, up } of [
	{ name: '↓ / ↑', down: 'ArrowDown', up: 'ArrowUp' },
	{ name: 'Ctrl+N / Ctrl+P', down: 'Control+n', up: 'Control+p' },
]) {
	test(`preview を開いたあと ${name} でスクロールできる`, async () => {
		const window = await app.firstWindow();
		await settleVaultWindow(app, window);

		// long-note だけに当たる語で検索する
		await window.getByLabel('Search', { exact: true }).click();
		const searchInput = window.getByRole('searchbox', { name: 'Search...' });
		await searchInput.fill('line 200');
		await expect(window.getByRole('button', { name: 'long-note' })).toBeVisible();

		// 検索結果を選んで preview を開く
		await window.keyboard.press('ArrowDown');
		await window.keyboard.press('Control+Space');
		await expect(window.locator(PREVIEW_CONTENT)).toContainText('line 1');

		// 中身のレイアウトが終わり、preview がスクロールできるようになるのを待つ
		await expect
			.poll(() =>
				window.evaluate(() => {
					const modal = document.querySelector('.modal-container .modal');
					return modal ? modal.scrollHeight - modal.clientHeight : 0;
				}),
			)
			.toBeGreaterThan(1000);

		const initial = await previewScrollOffset(window);

		for (let i = 0; i < 5; i++) {
			await window.keyboard.press(down);
		}
		await expect
			.poll(() => previewScrollOffset(window), {
				message: `${down} should scroll the preview down`,
			})
			.toBeGreaterThan(initial + 100);
		// The scroll is smooth: wait for it to finish before taking the position
		// the way back is measured from.
		const scrolled = await settledScrollOffset(window);

		for (let i = 0; i < 5; i++) {
			await window.keyboard.press(up);
		}
		await expect
			.poll(() => previewScrollOffset(window), {
				message: `${up} should scroll the preview up`,
			})
			.toBeLessThan(scrolled - 100);
		// As many presses up as down come back to the top. The keys must not
		// reach the editor in the preview: it would move its cursor and scroll
		// the cursor into view, stopping the scroll partway.
		await expect
			.poll(() => settledScrollOffset(window), {
				message: `${up} should scroll back to where ${down} started`,
			})
			.toBeCloseTo(initial, 0);
	});
}
