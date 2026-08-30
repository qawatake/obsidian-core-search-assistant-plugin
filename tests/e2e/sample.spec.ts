import test, {
	type Dialog,
	expect,
	type ElectronApplication,
	type Locator,
	type Page,
	_electron as electron,
} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const appPath = path.resolve('./.obsidian-unpacked/main.js');
const vaultPath = path.resolve('./e2e-vault');

let app: ElectronApplication;

/**
 * Click `target`, first dismissing any confirmation modal Obsidian may have
 * opened on startup. In CI a `.modal-container.mod-confirmation` sometimes
 * appears right after launch and swallows the first click (flaky timeout).
 * The trust prompt must be accepted, anything else is closed with Escape.
 * The modal text is logged so the cause is visible in the CI log.
 */
async function clickPastStartupModals(window: Page, target: Locator) {
	const attempts = 10;
	for (let i = 0; i < attempts; i++) {
		const modal = window.locator('.modal-container');
		if ((await modal.count()) > 0) {
			const text = (await modal.first().innerText())
				.replace(/\s+/g, ' ')
				.slice(0, 200);
			console.log(`[e2e] modal open at startup, dismissing: ${text}`);
			const trust = modal.getByRole('button', {
				name: 'Trust author and enable plugins',
			});
			if ((await trust.count()) > 0) {
				await trust.click();
			} else {
				await window.keyboard.press('Escape');
			}
			await modal
				.first()
				.waitFor({ state: 'detached', timeout: 5_000 })
				.catch(() => {});
		}
		try {
			await target.click({ timeout: 3_000 });
			return;
		} catch (e) {
			if (i === attempts - 1) throw e;
		}
	}
}

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
	const handleDialogs = (page: Page) => {
		page.on("dialog", (dialog: Dialog) => dialog.accept().catch(() => {}));
	};
	app.on("window", handleDialogs);
	for (const page of app.windows()) {
		handleDialogs(page);
	}
});

test.afterEach(async () => {
	// app.close() can hang if Obsidian blocks shutdown (observed with the
	// latest Obsidian in CI), so bound it and force-kill as a fallback.
	if (!app) return;
	// Grab the process handle first: after a successful close() the
	// ElectronApplication object is disposed and process() throws.
	const obsidianProcess = app.process();
	await Promise.race([
		app.close(),
		new Promise((resolve) => setTimeout(resolve, 15_000)),
	]);
	obsidianProcess.kill();
});

test('検索してカードをクリックするとファイルを開ける', async () => {
	const window = await app.firstWindow();
	// サーチボタンをクリック
	await clickPastStartupModals(
		window,
		window.getByLabel('Search', { exact: true }),
	);

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
