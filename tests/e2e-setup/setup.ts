import test, {
  expect,
  type ElectronApplication,
  _electron as electron,
} from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

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
});

test.afterEach(async () => {
  await app?.close();
});

test("検索してカードをクリックするとファイルを開ける", async () => {
  let window = await app.firstWindow();

  // Obsidian 側で 'did-finish-load' が発火するまで待つ
  await window.waitForEvent("domcontentloaded");

  // ファイルピッカーをstub
  await app.evaluate(async ({ dialog }, fakePath) => {
    dialog.showOpenDialogSync = () => {
      return [fakePath];
    };
  }, vaultPath);

  const openButton = window.getByRole("button", { name: "Open" });
  await openButton.click();

  // windowを読み直す
  window = await app.waitForEvent("window");

  // Trust the author of the vault
  await window
    .getByRole("button", { name: "Trust author and enable plugins" })
    .click();

  // Close a modal for community plugins
  await window.keyboard.press("Escape");
});
