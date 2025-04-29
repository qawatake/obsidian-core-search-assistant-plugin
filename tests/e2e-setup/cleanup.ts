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
    args: [
      appPath,
      // `obsidian://open?path=${encodeURIComponent(vaultPath)}`,
    ],
  });
});

test.afterEach(async () => {
  await app?.close();
});

test("検索してカードをクリックするとファイルを開ける", async () => {
  let window = await app.firstWindow();

  // コマンド "Open another vault"を実行
  {
    // コマンドパレットを開く
    await window.getByLabel("Open command palette", { exact: true }).click();

    // コマンドパレットに入力
    const commandPalette = window.locator(":focus");
    await commandPalette.fill("open another vault");
    await commandPalette.press("Enter");
  }

  // 新規windowが開くまで待つ
  window = await app.waitForEvent("window", (w) => w.url().includes("starter"));

  // もともと開いていたウィンドウを閉じる
  {
    const originalWindow = app
      .windows()
      .find((w) => !w.url().includes("starter"));
    await originalWindow?.close();
  }

  // 登録されていたvaultを削除
  {
    await window
      .getByLabel(vaultPath)
      .getByLabel("More options", { exact: true })
      .click();
    await window.getByText("Remove from list").click();
  }
});
