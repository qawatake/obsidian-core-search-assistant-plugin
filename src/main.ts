import {
	App,
	Command,
	Editor,
	KeymapContext,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TAbstractFile,
	TFile,
} from 'obsidian';
import { AppExtension } from './uncover';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default',
};

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		// this.registerEvent(
		// 	this.app.vault.on('create', (file: TAbstractFile) => {
		// 		if (file instanceof TFile) {
		// 			if (file.extension === 'png') {
		// 				console.log(file.name);
		// 				this.app.vault.create(
		// 					`info_of_${file.basename}.md`,
		// 					`ctime: ${file.stat.ctime}, mtime: ${file.stat.mtime}`
		// 				);
		// 			}
		// 		}
		// 	})
		// );

		const app = this.app as AppExtension;
		console.log(app);

		// const command = await this.waitUntilCommandsFound();
		// console.log(command);

		await this.loadSettings();

		this.app.workspace.onLayoutReady(async () => {
			// console.log(app.workspace.leftSplit);
			// console.log(this.app.workspace.leftSplit.children);
			this.hasFocusOnSearchInput();
			console.log(this.findSearchLeaf());
			const searchLeaf = this.findSearchLeaf();
			const inputEl = searchLeaf?.querySelector(
				'input[type="text"]'
			) as HTMLInputElement;
			console.log(inputEl);

			this.registerDomEvent(inputEl, 'focus', () => {
				console.log('a');
				console.log(this.hasFocusOnSearchInput());
			});
		});
	}

	onunload() {}

	hasFocusOnSearchInput(): boolean {
		const { containerEl } = this.app.workspace.leftSplit;
		if (!(containerEl instanceof HTMLElement)) {
			return false;
		}
		const inputEl = containerEl.querySelector(
			'div.search-input-container > input'
		);
		if (inputEl === null) {
			return false;
		}
		if (!document.hasFocus()) {
			return false;
		}
		if (document.activeElement !== inputEl) {
			console.log(document.activeElement);
			return false;
		}
		return true;
	}

	findSearchLeaf(): HTMLElement | undefined {
		const leafs = this.app.workspace.leftSplit.children[0].children as {
			containerEl: HTMLElement;
		}[];
		return leafs.find((leaf) => {
			const { containerEl } = leaf;
			const inputEl = containerEl.querySelector(
				'div.workspace-leaf-content[data-type="search"'
			);
			return inputEl !== null;
		})?.containerEl;
	}

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

	async waitUntilCommandsFound(): Promise<Command> {
		const app = this.app as AppExtension;
		for (let i = 0; i < 100; i++) {
			const command = app.commands.commands['command-palette:open'];
			if (command) {
				console.log(i);
				return command;
			}
			await new Promise((s) => {
				setTimeout(s, 1);
			});
		}
		return Promise.reject('timeout: failed to load commands');
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Settings for my awesome plugin.' });

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc("It's a secret")
			.addText((text) =>
				text
					.setPlaceholder('Enter your secret')
					.setValue(this.plugin.settings.mySetting)
					.onChange(async (value) => {
						console.log('Secret: ' + value);
						this.plugin.settings.mySetting = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
