import { type ElectronApplication, expect, type Page } from "@playwright/test";

export const PLUGIN_ID = "obsidian-core-search-assistant-plugin";

type ObsidianGlobal = {
	app?: { plugins?: { plugins?: Record<string, unknown> } };
};

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
