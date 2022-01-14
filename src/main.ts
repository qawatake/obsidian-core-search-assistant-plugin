import { Controller } from 'Controller';
import { CoreSearchInterface } from 'CoreSearchInterface';
import { Plugin } from 'obsidian';

import { AppExtension } from './uncover';

const keys = [
	'a',
	'b',
	'c',
	'd',
	'e',
	'f',
	'g',
	'h',
	'i',
	'j',
	'k',
	'l',
	'm',
	'n',
	'o',
	'p',
	'q',
	'r',
	's',
	't',
	'u',
	'v',
	'x',
	'y',
	'z',
	'0',
	'1',
	'2',
	'3',
	'4',
	'5',
	'6',
	'7',
	'8',
	'9',
	'-',
	';',
	"'",
	'[',
	']',
] as const;

type AvailableKey = typeof keys[number];

interface MyPluginSettings {
	mySetting: string;
	keymapInSearchOptionMode: {
		toggleMatchingCase: AvailableKey;
		toggleExplainSearch: AvailableKey;
		toggleCollapseAll: AvailableKey;
		toggleExtraContext: AvailableKey;
		alphabeticalSort: AvailableKey;
		alphabeticalReverseSort: AvailableKey;
		sortByModifiedTime: AvailableKey;
		sortByModifiedTimeReverse: AvailableKey;
		sortByCreatedTime: AvailableKey;
		sortbyCreatedTimeReverse: AvailableKey;
	};
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default',
	keymapInSearchOptionMode: {
		toggleMatchingCase: 'a',
		toggleExplainSearch: 's',
		toggleCollapseAll: 'd',
		toggleExtraContext: 'f',
		alphabeticalSort: 'g',
		alphabeticalReverseSort: 'h',
		sortByModifiedTime: 'j',
		sortByModifiedTimeReverse: 'k',
		sortByCreatedTime: 'l',
		sortbyCreatedTimeReverse: ';',
	},
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
