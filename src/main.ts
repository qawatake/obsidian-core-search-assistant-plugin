import { Controller } from 'Controller';
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

	override async onload() {
		const app = this.app as AppExtension;
		console.log(app);

		await this.loadSettings();

		this.controller = new Controller(this.app, this).setup();

		this.app.workspace.onLayoutReady(() => {
			console.log(
				(this.app.vault as any).getConfig('communityPluginSortOrder')
			);
		});
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
