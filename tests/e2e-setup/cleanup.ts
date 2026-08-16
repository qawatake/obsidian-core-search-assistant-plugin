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
  // コマンド登録の完了を待つ。commands registry自体はworkspace初期化前から
  // 存在するため、個別コマンドの登録まで確認しないとexecuteが空振りする
  await window.waitForFunction(
    () =>
      // @ts-expect-error app is a global in the Obsidian renderer
      window.app?.commands?.findCommand?.("app:open-vault") != null,
  );
  await window.evaluate(() => {
    // @ts-expect-error app is a global in the Obsidian renderer
    window.app.commands.executeCommandById("app:open-vault");
  });

  // vault chooserウィンドウを待つ。waitForEvent("window")だとリスナー登録前に
  // ウィンドウが開いた場合を取りこぼすため、app.windows()をポーリングする
  await expect
    .poll(() => app.windows().some((w) => w.url().includes("starter")))
    .toBe(true);
  window = app.windows().find((w) => w.url().includes("starter"))!;

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
