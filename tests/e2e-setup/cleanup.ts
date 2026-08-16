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
      "open",
      `obsidian://open?path=${encodeURIComponent(vaultPath)}`,
    ],
  });
});

test.afterEach(async () => {
  await app?.close();
});

test("テスト用vaultの登録を解除する", async () => {
  let window = await app.firstWindow();

  // vault chooserを開く。コマンド名がObsidianのバージョンによって変わる
  // ("Open another vault" -> "Manage vaults...") ため、安定しているid経由で実行する
  await window.evaluate(() => {
    // @ts-expect-error app is a global in the Obsidian renderer
    window.app.commands.executeCommandById("app:open-vault");
  });

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
