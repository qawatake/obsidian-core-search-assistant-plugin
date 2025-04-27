import { defineConfig, devices } from '@playwright/test';

// See https://playwright.dev/docs/test-configuration.
export default defineConfig({
	testDir: './e2e',
	fullyParallel: false,
	forbidOnly: !!process.env['CI'],
	use: {
		trace: 'retain-on-failure',
	},
	projects: [
		{
			name: 'obsidian',
			use: { ...devices['Desktop Chrome'] },
		},
	],
	timeout: 300 * 1000,
});
