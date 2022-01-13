import { Controller } from 'Controller';
import { CoreSearchInterface } from 'CoreSearchInterface';
import { Plugin } from 'obsidian';

import { AppExtension } from './uncover';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default',
};

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings | undefined;
	controller: Controller | undefined;
	coreSearchInterface: CoreSearchInterface | undefined;

	override async onload() {
		const app = this.app as AppExtension;

		this.controller = new Controller(this.app, this);
		this.coreSearchInterface = new CoreSearchInterface(this.app, this);

		this.app.workspace.onLayoutReady(() => {
			const inputEl = this.coreSearchInterface?.getSearchInput();
			if (!inputEl) {
				return;
			}

			this.registerDomEvent(inputEl as HTMLElement, 'blur', () => {
				this.controller?.exit();
			});
			this.registerDomEvent(inputEl as HTMLElement, 'input', () => {
				this.controller?.reset();
			});
			this.registerDomEvent(inputEl as HTMLElement, 'focus', () => {
				this.controller?.enter();
			});
		});

		console.log(app);

		await this.loadSettings();
	}

	// onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
