import { defineConfig, devices } from "@playwright/test";

// See https://playwright.dev/docs/test-configuration.
export default defineConfig({
  fullyParallel: false,
  forbidOnly: !!process.env["CI"],
  use: {
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "e2e",
      testDir: "./tests/e2e",
    },
    {
      name: "e2e-setup",
      testDir: "./tests/e2e-setup",
      testMatch: "**/*.ts",
    },
  ],
  timeout: 300 * 1000,
});
