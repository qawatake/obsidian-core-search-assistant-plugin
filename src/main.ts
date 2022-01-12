import { ExampleModal } from 'Modal';
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
		const app = this.app as AppExtension;
		console.log(app);

		await this.loadSettings();

		let id = -1;
		this.app.scope.register(['Ctrl'], 'N', () => {
			if (!this.hasFocusOnSearchInput()) {
				return;
			}

			const resultsContainerEl = this.findSearchLeaf()?.querySelector(
				'div.search-results-children'
			);
			const resultEls = resultsContainerEl?.querySelectorAll(
				'div.search-result-file-title'
			);
			const numResults = resultEls?.length ?? 0;
			id++;
			id = id < numResults ? id : numResults - 1;
			resultEls?.forEach((el, i) => {
				if (id === i) {
					el.addClass('fake-hover');
					el.scrollIntoView({ block: 'center' });
				} else {
					el.removeClass('fake-hover');
				}
			});
		});
		this.app.scope.register(['Ctrl'], 'P', () => {
			if (!this.hasFocusOnSearchInput()) {
				return;
			}
			id--;
			id = id >= 0 ? id : 0;

			const resultsContainerEl = this.findSearchLeaf()?.querySelector(
				'div.search-results-children'
			);
			const resultEls = resultsContainerEl?.querySelectorAll(
				'div.search-result-file-title'
			);
			resultEls?.forEach((el, i) => {
				if (id === i) {
					el.addClass('fake-hover');
					el.scrollIntoView({ block: 'center' });
				} else {
					el.removeClass('fake-hover');
				}
			});
		});
		this.app.scope.register(['Mod', 'Shift'], 'Enter', () => {
			if (!(this.hasFocusOnSearchInput() && id >= 0)) {
				return;
			}
			const resultsContainerEl = this.findSearchLeaf()?.querySelector(
				'div.search-results-children'
			);
			const resultEls = resultsContainerEl?.querySelectorAll(
				'div.search-result-file-title'
			);
			(resultEls[id] as HTMLElement).click();
			return;
		});
		this.app.scope.register(['Ctrl'], 'Enter', () => {
			if (!(this.hasFocusOnSearchInput() && id >= 0)) {
				return;
			}

			const resultsContainerEl = this.findSearchLeaf()?.querySelector(
				'div.search-results-children'
			);
			const resultEls = resultsContainerEl?.querySelectorAll(
				'div.search-result-file-title'
			);

			const resultEl = resultEls[id] as HTMLElement;
			const filenameEl = resultEl.querySelector('div.tree-item-inner');
			console.log(filenameEl?.textContent);
			const filename = filenameEl?.textContent;
			const file = this.app.metadataCache.getFirstLinkpathDest(
				filename as string,
				'/'
			);
			new ExampleModal(this.app, file).open();
			return;
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
