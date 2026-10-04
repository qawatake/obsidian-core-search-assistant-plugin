import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
	type Dialog,
	type ElectronApplication,
	_electron as electron,
	expect,
	type Page,
} from "@playwright/test";

export const PLUGIN_ID = "obsidian-core-search-assistant-plugin";

type ObsidianGlobal = {
	app?: { plugins?: { plugins?: Record<string, unknown> } };
};

const appPath = path.resolve("./.obsidian-unpacked/main.js");
const vaultTemplatePath = path.resolve("./e2e-vault");

const tmpDirs = new WeakMap<ElectronApplication, string>();

/**
 * Launch Obsidian on a copy of the test vault with a throw-away user data dir.
 *
 * The npm `electron` binary runs Obsidian under the app name "obsidian", so by
 * default it shares `~/Library/Application Support/obsidian` with the
 * Obsidian you use every day: its vault list, the vault last opened, the
 * auto-update setting. Pointing `--user-data-dir` at a fresh directory keeps
 * the tests away from that, and lets each test register the vault itself:
 * Obsidian reads the vault list and `updateDisabled` from `obsidian.json` at
 * startup and opens the vault marked `open`.
 *
 * The vault is copied too, so that what Obsidian writes into it (workspace,
 * core plugin list, ...) neither dirties the repository nor leaks into the
 * next test.
 */
export async function launchObsidian(): Promise<ElectronApplication> {
	const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "obsidian-e2e-"));
	const userDataDir = path.join(tmpDir, "user-data");
	const vaultPath = path.join(tmpDir, "vault");
	// The plugin files in the vault are symlinks to the build output
	// (scripts/setup-obsidian.sh); copied as they are, they keep pointing there.
	await fs.cp(vaultTemplatePath, vaultPath, { recursive: true });
	await fs.rm(path.join(vaultPath, ".obsidian", "workspace.json"), {
		force: true,
	});
	await fs.mkdir(userDataDir);
	await fs.writeFile(
		path.join(userDataDir, "obsidian.json"),
		JSON.stringify({
			vaults: {
				[randomBytes(8).toString("hex")]: {
					path: vaultPath,
					ts: Date.now(),
					open: true,
				},
			},
			// The tests must run the version setup-obsidian.sh unpacked, and the
			// update flow must not pop UI over them.
			updateDisabled: true,
		}),
	);

	const app = await electron.launch({
		args: [appPath, `--user-data-dir=${userDataDir}`],
	});
	tmpDirs.set(app, tmpDir);

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
	return app;
}

/** Close an Obsidian started by launchObsidian and remove its vault copy and user data dir. */
export async function closeObsidian(app: ElectronApplication) {
	// app.close() can hang if Obsidian blocks shutdown, so bound it and
	// force-kill as a fallback. The process handle must be grabbed before
	// close(): a disposed ElectronApplication throws from process().
	const obsidianProcess = app.process();
	await Promise.race([
		app.close(),
		new Promise((resolve) => setTimeout(resolve, 15_000)),
	]);
	obsidianProcess.kill();

	const tmpDir = tmpDirs.get(app);
	if (tmpDir) {
		await fs.rm(tmpDir, { recursive: true, force: true });
	}
}

/**
 * Bring a freshly opened vault window to a quiet state: the plugin is loaded,
 * no modal is open and the vault window has the focus. Call it before the
 * first interaction.
 *
 * On startup Obsidian either loads the community plugins, or, when the vault
 * is not trusted yet (`enable-plugin-<appId>` missing from localStorage),
 * shows the "Do you trust the author of this vault?" prompt instead.
 * "Trust author and enable plugins" keeps the prompt open while it awaits
 * `plugins.setEnable(true)`, then opens Settings > Community plugins and only
 * then closes the prompt. Obsidian 1.13 shows Settings in a separate window,
 * which takes the focus: from then on the quick switcher and other modals open
 * in that window, not in `page`, and `page` has nothing focused. Renderer
 * evaluates issued while that window is being created can also fail with
 * "Resulting promise was garbage collected". So wait for Settings to appear
 * (wherever it is), close it, and give the focus back to `page`.
 */
export async function settleVaultWindow(
	app: ElectronApplication,
	page: Page,
	pluginId = PLUGIN_ID,
) {
	// The two startup outcomes are exclusive: the prompt is shown instead of
	// loading plugins, so one of them always becomes true.
	await page.waitForFunction(
		(id) =>
			document.querySelector(".modal.mod-trust-folder") !== null ||
			!!(globalThis as ObsidianGlobal).app?.plugins?.plugins?.[id],
		pluginId,
	);

	const trustPrompt = page.locator(".modal.mod-trust-folder");
	if ((await trustPrompt.count()) > 0) {
		console.log("[e2e] vault trust prompt shown at startup, trusting");
		await trustPrompt
			.getByRole("button", { name: "Trust author and enable plugins" })
			.click();

		await expect
			.poll(async () => (await findSettingsWindow(app)) !== undefined, {
				message: "Settings should open after trusting the vault",
			})
			.toBe(true);
		const settings = await findSettingsWindow(app);
		if (settings === page) {
			await page.keyboard.press("Escape");
		} else {
			// Closing the window closes the modal in it (Obsidian listens for
			// `pagehide` on popout windows).
			await settings?.close();
		}
		await expect
			.poll(async () => (await findSettingsWindow(app)) === undefined, {
				message: "Settings should be closed",
			})
			.toBe(true);
		await page.bringToFront();
	}

	const modal = page.locator(".modal-container");
	if ((await modal.count()) > 0) {
		const text = (await modal.first().innerText())
			.replace(/\s+/g, " ")
			.slice(0, 200);
		console.log(`[e2e] unexpected modal open at startup, closing: ${text}`);
		await page.keyboard.press("Escape");
	}
	await expect(modal).toHaveCount(0);

	await page.waitForFunction(
		(id) =>
			document.hasFocus() &&
			!!(globalThis as ObsidianGlobal).app?.plugins?.plugins?.[id],
		pluginId,
	);
}

/** The window showing Obsidian's Settings modal, if any. */
async function findSettingsWindow(
	app: ElectronApplication,
): Promise<Page | undefined> {
	for (const w of app.windows()) {
		if (w.isClosed()) continue;
		// A window that is being created or torn down can reject the query;
		// treat it as "not there yet" and let the caller poll again.
		const count = await w
			.locator(".modal.mod-settings")
			.count()
			.catch(() => 0);
		if (count > 0) return w;
	}
	return undefined;
}
