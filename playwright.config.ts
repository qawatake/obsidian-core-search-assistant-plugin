import { defineConfig } from "@playwright/test";

// See https://playwright.dev/docs/test-configuration.
export default defineConfig({
  fullyParallel: false,
  // Each test drives its own Obsidian window with the keyboard and waits for
  // it to have the focus, so two of them cannot run side by side.
  workers: 1,
  forbidOnly: !!process.env["CI"],
  use: {
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "e2e",
      testDir: "./tests/e2e",
    },
  ],
  timeout: 300 * 1000,
});
