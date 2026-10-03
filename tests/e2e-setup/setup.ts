import test, {
  type Dialog,
  expect,
  type ElectronApplication,
  type Page,
  _electron as electron,
} from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { settleVaultWindow } from "../support/obsidian";

const appPath = path.resolve("./.obsidian-unpacked/main.js");
const vaultPath = path.resolve("./e2e-vault");

let app: ElectronApplication;

test.beforeEach(async () => {
  await fs.rm(path.join(vaultPath, ".obsidian", "workspace.json"), {
    recursive: true,
    force: true,
  });

  app = await electron.launch({
    args: [appPath, "open"],
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

test("テスト用vaultを開き、Obsidianを開けばすぐにpluginを動かせるようにセットアップする", async () => {
	const starter = await app.firstWindow();

	// Wait for 'did-finish-load' event on Obsidian side
	await starter.waitForEvent("domcontentloaded");

	// Done in the main process, before any vault window exists, so nothing in
	// a renderer can race with it:
	// - stub the file picker used by the "Open" button;
	// - turn off Obsidian's auto-updater for this (throw-away) install: CI must
	//   test the version it downloaded, not whatever the updater fetches, and
	//   the update flow must not pop UI over the tests. This dispatches the
	//   same "disable-update" IPC the *Automatic updates* toggle sends; the
	//   handler only flips the flag and writes obsidian.json synchronously.
	// The callback is synchronous on purpose: it hands no promise back to the
	// inspector, so there is nothing for it to wait on or lose.
	const updatesDisabled = await app.evaluate(
		({ dialog, ipcMain }, fakePath) => {
			dialog.showOpenDialogSync = () => [fakePath];
			const event = { returnValue: undefined as unknown };
			ipcMain.emit("disable-update", event, true);
			return event.returnValue;
		},
		vaultPath,
	);
	expect(updatesDisabled).toBe(true);

	const [window] = await Promise.all([
		app.waitForEvent("window"),
		starter.getByRole("button", { name: "Open" }).click(),
	]);

	// A fresh vault shows the trust prompt; accept it and close the Settings
	// window Obsidian opens afterwards (see settleVaultWindow).
	await settleVaultWindow(app, window);

	// The trust decision (`enable-plugin-<appId>`, set synchronously by the
	// click above) lives in the vault window's localStorage, which Chromium
	// writes to disk lazily. Ask for the write now so it is on disk before the
	// app is closed; otherwise the next launch (pnpm e2e:test) can see the
	// prompt again.
	await app.evaluate(({ webContents }) => {
		for (const wc of webContents.getAllWebContents()) {
			wc.session.flushStorageData();
		}
	});
});
