import { Controller } from 'Controller';
import { SearchComponentInterface } from 'interfaces/SearchComponentInterface';
import { Plugin } from 'obsidian';
import {
	CoreSearchAssistantPluginSettings,
	CoreSearchAssistantSettingTab,
	DEFAULT_SETTINGS,
} from 'Setting';

export default class CoreSearchAssistantPlugin extends Plugin {
	settings: CoreSearchAssistantPluginSettings | undefined;
	controller: Controller | undefined;
	searchInterface: SearchComponentInterface | undefined;

	override async onload() {
		await this.loadSettings();

		// should be called before adding controller because controller depends on searchInterface
		this.searchInterface = this.addChild(
			new SearchComponentInterface(this.app, this)
		);
		this.controller = this.addChild(
			new Controller(this.app, this, this.searchInterface)
		);

		this.watchLayoutChange();

		this.addSettingTab(new CoreSearchAssistantSettingTab(this.app, this));
	}

	// override onunload() {}

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

	private renewController() {
		if (this.controller) {
			this.removeChild(this.controller);
		}
		if (this.searchInterface === undefined) {
			throw '[ERROR in Core Search Interface] failed to renewController: plugin.searchInterface = undefined';
		}
		this.controller = this.addChild(
			new Controller(this.app, this, this.searchInterface)
		);
	}

	private watchLayoutChange() {
		// ↓ is necessary to skip layout-change when Obsidian reload
		this.app.workspace.onLayoutReady(() => {
			// ↓ is necessary because dom elements such as input form and containerEl for card view will be removed when layout change
			this.app.workspace.on('layout-change', async () => {
				if (await this.controller?.layoutChanged()) {
					this.renewController();
				}
			});
		});
	}
}
